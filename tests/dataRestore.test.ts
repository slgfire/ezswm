import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma } from './testHelpers'
import { restoreAll } from '../server/utils/dataRestore'

describe('restoreAll', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>

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
  })

  function mkPayload(extra: Record<string, unknown[]> = {}) {
    const siteId = randomUUID()
    const userId = randomUUID()
    return {
      schema: 'sqlite-v1',
      data: {
        users: [{
          id: userId, username: 'admin', display_name: 'Admin', password_hash: 'x',
          role: 'admin', language: 'en', is_setup_user: true,
          created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
        }],
        settings: [{
          id: 'singleton', app_name: 'ezSWM', app_logo_url: null, default_vlan: null,
          default_port_status: 'down', port_speeds: JSON.stringify(['1G']),
          setup_completed: true, sites_initialized: true
        }],
        sites: [{
          id: siteId, slug: 'restored', name: 'Restored', description: null,
          created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
        }],
        ...extra
      }
    }
  }

  it('restores a basic payload', async () => {
    await prisma.site.create({ data: { id: randomUUID(), slug: 'will-be-wiped', name: 'will-be-wiped', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } })

    const result = await restoreAll(prisma, mkPayload())

    expect(result.inserted.users).toBe(1)
    expect(result.inserted.settings).toBe(1)
    expect(result.inserted.sites).toBe(1)

    // Old site is gone, new one is in.
    const sites = await prisma.site.findMany()
    expect(sites.length).toBe(1)
    expect(sites[0]!.name).toBe('Restored')
  })

  it('rejects payload without schema marker if invalid', async () => {
    await expect(restoreAll(prisma, { schema: 'wrong-schema', data: {} }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects payload missing data object', async () => {
    await expect(restoreAll(prisma, {})).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects non-UUID ids upfront (no partial restore)', async () => {
    await prisma.site.create({ data: { id: randomUUID(), slug: 'pre', name: 'pre', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } })

    const payload = {
      schema: 'sqlite-v1',
      data: {
        sites: [{ id: 'not-a-uuid', slug: 'bad', name: 'bad', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }]
      }
    }
    await expect(restoreAll(prisma, payload)).rejects.toMatchObject({ statusCode: 400 })

    // Pre-existing data is untouched (validation runs before any writes).
    expect(await prisma.site.count()).toBe(1)
    expect((await prisma.site.findFirst())?.name).toBe('pre')
  })

  it('round-trips cross-references (FK insertion order)', async () => {
    const siteId = randomUUID()
    const vlanId = siteId === randomUUID() ? randomUUID() : randomUUID()
    const networkId = randomUUID()
    const allocId = randomUUID()

    const payload = {
      schema: 'sqlite-v1',
      data: {
        sites: [{ id: siteId, slug: 'site-x', name: 'X', description: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
        vlans: [{
          id: vlanId, site_id: siteId, vlan_id: 10, name: 'V', description: null,
          status: 'active', routing_device: null, color: '#EF4444', is_favorite: false,
          created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
        }],
        networks: [{
          id: networkId, site_id: siteId, slug: 'net-n', name: 'N', vlan_id: vlanId, subnet: '10.0.0.0/24',
          gateway: '10.0.0.1', dns_servers: JSON.stringify([]), description: null, is_favorite: false,
          created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
        }],
        ipAllocations: [{
          id: allocId, network_id: networkId, ip_address: '10.0.0.10', hostname: null,
          mac_address: null, device_type: null, description: null, status: 'active',
          created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
        }]
      }
    }

    const result = await restoreAll(prisma, payload)
    expect(result.inserted.sites).toBe(1)
    expect(result.inserted.vlans).toBe(1)
    expect(result.inserted.networks).toBe(1)
    expect(result.inserted.ipAllocations).toBe(1)

    const network = await prisma.network.findUnique({ where: { id: networkId } })
    expect(network?.vlan_id).toBe(vlanId)
    const alloc = await prisma.ipAllocation.findUnique({ where: { id: allocId } })
    expect(alloc?.network_id).toBe(networkId)
  })

  it('rolls back atomically on insert failure', async () => {
    // FK violation: network references a non-existent site_id, but UUID format is OK
    // so the pre-validation pass lets it through.
    const siteId = randomUUID()
    const orphanSiteRef = randomUUID()
    const payload = {
      schema: 'sqlite-v1',
      data: {
        sites: [{ id: siteId, slug: 'site-s', name: 'S', description: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
        networks: [{
          id: randomUUID(),
          site_id: orphanSiteRef, // ← points at a UUID that won't exist
          slug: 'net-orphan',
          name: 'orphan',
          vlan_id: null,
          subnet: '10.0.0.0/24',
          gateway: null,
          dns_servers: JSON.stringify([]),
          description: null,
          is_favorite: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z'
        }]
      }
    }

    await expect(restoreAll(prisma, payload)).rejects.toThrow()

    // Transaction rolled back — nothing inserted.
    expect(await prisma.site.count()).toBe(0)
    expect(await prisma.network.count()).toBe(0)
  })
})
