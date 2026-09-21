import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import dashboardStats from '../server/api/dashboard/stats.get'
import networkUtilization from '../server/api/networks/[id]/utilization.get'

describe('dashboard utilization exclusions', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteId: string
  let includedNetworkId: string
  let excludedNetworkId: string

  beforeAll(async () => {
    const context = await createTestPrisma()
    prisma = context.prisma
    resetDb = context.resetDb
    cleanup = context.cleanup
    globalThis.__prismaTestClient = prisma
  })

  afterAll(async () => {
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })

  beforeEach(async () => {
    await resetDb()
    siteId = (await seedSite(prisma, { slug: 'hq' })).id
    const now = new Date().toISOString()

    includedNetworkId = randomUUID()
    excludedNetworkId = randomUUID()

    await prisma.network.createMany({
      data: [
        {
          id: includedNetworkId,
          site_id: siteId,
          slug: 'included',
          name: 'Included',
          subnet: '10.0.0.0/29',
          gateway: '10.0.0.1',
          vlan_id: null,
          dns_servers: '[]',
          description: null,
          is_favorite: false,
          exclude_from_utilization: false,
          created_at: now,
          updated_at: now
        },
        {
          id: excludedNetworkId,
          site_id: siteId,
          slug: 'excluded',
          name: 'Excluded',
          subnet: '10.0.1.0/29',
          gateway: '10.0.1.1',
          vlan_id: null,
          dns_servers: '[]',
          description: null,
          is_favorite: false,
          exclude_from_utilization: true,
          created_at: now,
          updated_at: now
        }
      ]
    })

    await prisma.ipAllocation.createMany({
      data: [
        { id: randomUUID(), network_id: includedNetworkId, ip_address: '10.0.0.2', hostname: null, mac_address: null, device_type: null, description: null, status: 'active', created_at: now, updated_at: now },
        { id: randomUUID(), network_id: excludedNetworkId, ip_address: '10.0.1.2', hostname: null, mac_address: null, device_type: null, description: null, status: 'active', created_at: now, updated_at: now },
        { id: randomUUID(), network_id: excludedNetworkId, ip_address: '10.0.1.3', hostname: null, mac_address: null, device_type: null, description: null, status: 'active', created_at: now, updated_at: now },
        { id: randomUUID(), network_id: excludedNetworkId, ip_address: '10.0.1.4', hostname: null, mac_address: null, device_type: null, description: null, status: 'active', created_at: now, updated_at: now },
        { id: randomUUID(), network_id: excludedNetworkId, ip_address: '10.0.1.5', hostname: null, mac_address: null, device_type: null, description: null, status: 'active', created_at: now, updated_at: now },
        { id: randomUUID(), network_id: excludedNetworkId, ip_address: '10.0.1.6', hostname: null, mac_address: null, device_type: null, description: null, status: 'active', created_at: now, updated_at: now }
      ]
    })
  })

  it('filters excluded networks from dashboard utilization and high-usage warnings only', async () => {
    const stats = await dashboardStats({ query: { site_id: siteId } } as never) as {
      counts: { networks: number }
      networkUtilization: Array<{ id: string }>
      highUsageNetworks: Array<{ id: string }>
    }

    expect(stats.counts.networks).toBe(2)
    expect(stats.networkUtilization.map(n => n.id)).toEqual([includedNetworkId])
    expect(stats.highUsageNetworks).toEqual([])
  })

  it('keeps per-network utilization endpoint unchanged for excluded networks', async () => {
    const result = await networkUtilization({ context: { params: { id: excludedNetworkId } } } as never) as { utilization_percent: number }
    expect(result.utilization_percent).toBeGreaterThan(80)
  })
})
