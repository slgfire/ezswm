import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedNetwork, seedIpRange } from './testHelpers'
import { networkRepository } from '../server/repositories/networkRepository'
import { ipAllocationRepository } from '../server/repositories/ipAllocationRepository'
import { ipRangeRepository } from '../server/repositories/ipRangeRepository'

// Regression: API endpoints /api/networks/[id]/allocations and /ranges used the
// raw route param (slug) as network_id filter instead of network.id (UUID).
// Result: slug-based URLs always returned empty lists / "Network not found".
describe('network slug resolves correctly for allocation and range queries', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteId: string
  let networkId: string

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
    const site = await seedSite(prisma, { slug: 'hq' })
    siteId = site.id
    const net = await seedNetwork(prisma, {
      site_id: siteId,
      slug: 'mgmt',
      name: 'Mgmt',
      subnet: '10.0.1.0/24',
    })
    networkId = net.id

    // Seed one allocation and one range directly via prisma (no seedIpAllocation helper)
    const now = new Date().toISOString()
    await prisma.ipAllocation.create({
      data: {
        id: randomUUID(),
        network_id: networkId,
        ip_address: '10.0.1.10',
        hostname: 'host-a',
        mac_address: null,
        device_type: null,
        description: null,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    })
    await seedIpRange(prisma, {
      network_id: networkId,
      start_ip: '10.0.1.100',
      end_ip: '10.0.1.200',
      type: 'dhcp',
    })
  })

  // Confirm baseline: repository list works with UUID
  it('ipAllocationRepository.list returns allocations by UUID', async () => {
    const items = await ipAllocationRepository.list(networkId)
    expect(items).toHaveLength(1)
    expect(items[0].ip_address).toBe('10.0.1.10')
  })

  it('ipRangeRepository.list returns ranges by UUID', async () => {
    const items = await ipRangeRepository.list(networkId)
    expect(items).toHaveLength(1)
    expect(items[0].start_ip).toBe('10.0.1.100')
  })

  // Confirm the bug: raw slug does NOT match stored UUIDs
  it('ipAllocationRepository.list returns empty when called with slug directly', async () => {
    const items = await ipAllocationRepository.list('mgmt')
    expect(items).toHaveLength(0)
  })

  it('ipRangeRepository.list returns empty when called with slug directly', async () => {
    const items = await ipRangeRepository.list('mgmt')
    expect(items).toHaveLength(0)
  })

  // Confirm the fix: resolve slug via networkRepository.getById, then use network.id
  it('resolving slug via networkRepository.getById then using network.id returns allocations', async () => {
    const network = await networkRepository.getById('mgmt')
    expect(network).not.toBeNull()
    const items = await ipAllocationRepository.list(network!.id)
    expect(items).toHaveLength(1)
    expect(items[0].ip_address).toBe('10.0.1.10')
  })

  it('resolving slug via networkRepository.getById then using network.id returns ranges', async () => {
    const network = await networkRepository.getById('mgmt')
    expect(network).not.toBeNull()
    const items = await ipRangeRepository.list(network!.id)
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('dhcp')
  })
})
