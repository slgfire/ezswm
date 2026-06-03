import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedNetwork } from './testHelpers'
import { IMPORTERS } from '../server/utils/entityImport'

describe('entityImport', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteId: string

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
    siteId = (await seedSite(prisma)).id
  })

  it('imports valid VLAN rows', async () => {
    const result = await IMPORTERS.vlans([
      { site_id: siteId, vlan_id: 10, name: 'V10', color: '#EF4444' },
      { site_id: siteId, vlan_id: 20, name: 'V20', color: '#F97316' }
    ])
    expect(result.imported).toBe(2)
    expect(result.errors.length).toBe(0)
    expect(await prisma.vlan.count()).toBe(2)
  })

  it('rejects VLAN rows with missing required fields', async () => {
    const result = await IMPORTERS.vlans([
      { site_id: siteId, vlan_id: 10 }, // missing name
      { site_id: siteId, name: 'noVid' } // missing vlan_id
    ])
    expect(result.imported).toBe(0)
    expect(result.errors.length).toBe(2)
  })

  it('rejects VLAN rows with vlan_id out of range', async () => {
    const result = await IMPORTERS.vlans([
      { site_id: siteId, vlan_id: 0, name: 'V0', color: '#EF4444' },
      { site_id: siteId, vlan_id: 5000, name: 'V5000', color: '#F97316' }
    ])
    expect(result.imported).toBe(0)
    expect(result.errors.length).toBe(2)
  })

  it('rejects rows with unknown site_id', async () => {
    const result = await IMPORTERS.vlans([
      { site_id: '00000000-0000-4000-8000-000000000000', vlan_id: 10, name: 'V', color: '#EF4444' }
    ])
    expect(result.imported).toBe(0)
    expect(result.errors[0]?.message).toMatch(/not found/)
  })

  it('skips duplicate VLAN (site_id, vlan_id) and counts in skipped', async () => {
    await IMPORTERS.vlans([{ site_id: siteId, vlan_id: 10, name: 'V10', color: '#EF4444' }])
    const result = await IMPORTERS.vlans([
      { site_id: siteId, vlan_id: 10, name: 'Duplicate', color: '#F97316' }
    ])
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(1)
  })

  it('imports valid network rows + resolves vlan_id reference', async () => {
    const vlanResult = await IMPORTERS.vlans([
      { site_id: siteId, vlan_id: 10, name: 'V10', color: '#EF4444' }
    ])
    expect(vlanResult.imported).toBe(1)
    const vlan = await prisma.vlan.findFirst()
    const result = await IMPORTERS.networks([
      { site_id: siteId, name: 'N1', subnet: '10.0.1.0/24', gateway: '10.0.1.1', vlan_id: vlan!.id, dns_servers: '8.8.8.8;1.1.1.1' }
    ])
    expect(result.imported).toBe(1)
    const net = await prisma.network.findFirst()
    expect(net?.vlan_id).toBe(vlan!.id)
    expect(JSON.parse(net!.dns_servers)).toEqual(['8.8.8.8', '1.1.1.1'])
  })

  it('imports allocation rows + rejects bad IP', async () => {
    const { id: netId } = await seedNetwork(prisma, { site_id: siteId, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    const result = await IMPORTERS.allocations([
      { network_id: netId, ip_address: '10.0.1.10' },
      { network_id: netId, ip_address: 'bad-ip' }
    ])
    expect(result.imported).toBe(1)
    expect(result.errors.length).toBe(1)
  })

  it('imports range rows', async () => {
    const { id: netId } = await seedNetwork(prisma, { site_id: siteId, subnet: '10.0.1.0/24', gateway: '10.0.1.1' })
    const result = await IMPORTERS.ranges([
      { network_id: netId, start_ip: '10.0.1.10', end_ip: '10.0.1.50', type: 'dhcp' }
    ])
    expect(result.imported).toBe(1)
  })

  it('imports layout templates', async () => {
    const result = await IMPORTERS.templates([
      { name: 'Cisco 2960-24T', manufacturer: 'Cisco', model: '2960-24T', units: [{ unit_number: 1, blocks: [{ type: 'rj45', count: 24, start_index: 1, rows: 2 }] }] }
    ])
    expect(result.imported).toBe(1)
    const tpl = await prisma.layoutTemplate.findFirst()
    expect(tpl?.name).toBe('Cisco 2960-24T')
  })

  it('imports switches with FK resolution', async () => {
    const result = await IMPORTERS.switches([
      { site_id: siteId, name: 'sw-1' },
      { site_id: '00000000-0000-4000-8000-000000000000', name: 'orphan' }
    ])
    expect(result.imported).toBe(1)
    expect(result.errors.length).toBe(1)
  })
})
