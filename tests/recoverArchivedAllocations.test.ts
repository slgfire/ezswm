import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedNetwork } from './testHelpers'
import { recoverArchivedAllocations } from '../server/utils/recoverArchivedAllocations'

function writeArchive(dataDir: string, files: Record<string, unknown>): string {
  const archive = join(dataDir, '_archive_2026-06-05T00-00-00-000Z')
  mkdirSync(archive, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(archive, name), JSON.stringify(content))
  }
  return archive
}

describe('recoverArchivedAllocations', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let dataDir: string

  beforeAll(async () => {
    const ctx = await createTestPrisma()
    prisma = ctx.prisma
    resetDb = ctx.resetDb
    cleanup = ctx.cleanup
    globalThis.__prismaTestClient = prisma
  })

  afterAll(async () => {
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })

  beforeEach(async () => {
    await resetDb()
    dataDir = mkdtempSync(join(tmpdir(), 'ezswm-recover-'))
  })

  it('returns empty report when no archive exists', async () => {
    const result = await recoverArchivedAllocations({ prisma, dataDir })
    expect(result.archiveDir).toBe(null)
    expect(result.archivedAllocations).toBe(0)
  })

  it('dry-runs and reports would-insert without writing', async () => {
    const { id: siteId } = await seedSite(prisma, { name: 'HQ' })
    const { id: netId } = await seedNetwork(prisma, { site_id: siteId, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    writeArchive(dataDir, {
      'sites.json': [{ id: 'old-site', name: 'HQ' }],
      'networks.json': [{ id: 'old-net', site_id: 'old-site', name: 'Original Net', subnet: '10.0.1.0/24' }],
      'ip-allocations.json': [{ id: 'a1', network_id: 'old-net', ip_address: '10.0.1.10', hostname: 'srv1' }]
    })

    const result = await recoverArchivedAllocations({ prisma, dataDir, apply: false })
    expect(result.archivedAllocations).toBe(1)
    expect(result.recovered).toBe(1)
    expect(result.details[0]?.decision).toBe('dry-run-would-insert')
    expect(result.details[0]?.matchedNetworkId).toBe(netId)
    expect(await prisma.ipAllocation.count()).toBe(0)
  })

  it('inserts allocations when apply=true', async () => {
    const { id: siteId } = await seedSite(prisma, { name: 'HQ' })
    const { id: netId } = await seedNetwork(prisma, { site_id: siteId, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    writeArchive(dataDir, {
      'sites.json': [{ id: 'old-site', name: 'HQ' }],
      'networks.json': [{ id: 'old-net', site_id: 'old-site', name: 'Net', subnet: '10.0.1.0/24' }],
      'ip-allocations.json': [
        { id: 'a1', network_id: 'old-net', ip_address: '10.0.1.10', hostname: 'srv1', status: 'active' },
        { id: 'a2', network_id: 'old-net', ip_address: '10.0.1.11', hostname: 'srv2', status: 'active' }
      ]
    })

    const result = await recoverArchivedAllocations({ prisma, dataDir, apply: true })
    expect(result.recovered).toBe(2)
    const allocs = await prisma.ipAllocation.findMany({ where: { network_id: netId } })
    expect(allocs.length).toBe(2)
    expect(allocs.map(a => a.ip_address).sort()).toEqual(['10.0.1.10', '10.0.1.11'])
  })

  it('is idempotent — skips allocations already in DB', async () => {
    const { id: siteId } = await seedSite(prisma)
    const { id: netId } = await seedNetwork(prisma, { site_id: siteId, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    await prisma.ipAllocation.create({
      data: { id: randomUUID(), network_id: netId, ip_address: '10.0.1.10', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
    })
    writeArchive(dataDir, {
      'sites.json': [],
      'networks.json': [{ id: 'old-net', site_id: 'old', name: 'N', subnet: '10.0.1.0/24' }],
      'ip-allocations.json': [{ id: 'a1', network_id: 'old-net', ip_address: '10.0.1.10' }]
    })

    const result = await recoverArchivedAllocations({ prisma, dataDir, apply: true })
    expect(result.alreadyInDb).toBe(1)
    expect(result.recovered).toBe(0)
    expect(await prisma.ipAllocation.count()).toBe(1)
  })

  it('reports no-subnet-match for an IP that no current network covers', async () => {
    const { id: siteId } = await seedSite(prisma)
    await seedNetwork(prisma, { site_id: siteId, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    writeArchive(dataDir, {
      'sites.json': [],
      'networks.json': [{ id: 'old', site_id: 'old', name: 'N', subnet: '10.0.99.0/24' }],
      'ip-allocations.json': [{ id: 'a1', network_id: 'old', ip_address: '192.168.50.10' }]
    })

    const result = await recoverArchivedAllocations({ prisma, dataDir })
    expect(result.skippedNoSubnetMatch).toBe(1)
    expect(result.details[0]?.decision).toBe('no-subnet-match')
  })

  it('disambiguates overlapping subnets via site name', async () => {
    const { id: siteA } = await seedSite(prisma, { name: 'Site A' })
    const { id: siteB } = await seedSite(prisma, { name: 'Site B' })
    const { id: netA } = await seedNetwork(prisma, { site_id: siteA, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    await seedNetwork(prisma, { site_id: siteB, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    writeArchive(dataDir, {
      'sites.json': [{ id: 'old-a', name: 'Site A' }],
      'networks.json': [{ id: 'old-net-a', site_id: 'old-a', name: 'whatever', subnet: '10.0.1.0/24' }],
      'ip-allocations.json': [{ id: 'a1', network_id: 'old-net-a', ip_address: '10.0.1.10', status: 'active' }]
    })

    const result = await recoverArchivedAllocations({ prisma, dataDir, apply: true })
    expect(result.recovered).toBe(1)
    const alloc = await prisma.ipAllocation.findFirst()
    expect(alloc?.network_id).toBe(netA)
  })

  it('marks as ambiguous when subnets overlap and no extra context resolves it', async () => {
    const { id: siteA } = await seedSite(prisma, { name: 'Foo' })
    const { id: siteB } = await seedSite(prisma, { name: 'Bar' })
    await seedNetwork(prisma, { site_id: siteA, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    await seedNetwork(prisma, { site_id: siteB, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    writeArchive(dataDir, {
      'sites.json': [{ id: 'old-x', name: 'Unrelated' }],
      'networks.json': [{ id: 'old-net', site_id: 'old-x', name: 'Different', subnet: '10.0.1.0/24' }],
      'ip-allocations.json': [{ id: 'a1', network_id: 'old-net', ip_address: '10.0.1.10' }]
    })

    const result = await recoverArchivedAllocations({ prisma, dataDir, apply: true })
    expect(result.skippedAmbiguous).toBe(1)
    expect(await prisma.ipAllocation.count()).toBe(0)
  })

  it('skips invalid IPs', async () => {
    writeArchive(dataDir, {
      'sites.json': [],
      'networks.json': [],
      'ip-allocations.json': [{ id: 'a1', network_id: 'old', ip_address: 'not-an-ip' }]
    })
    const result = await recoverArchivedAllocations({ prisma, dataDir })
    expect(result.skippedInvalidIp).toBe(1)
  })
})
