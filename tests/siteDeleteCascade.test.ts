import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import deleteSite from '../server/api/sites/[id].delete'
import { siteRepository } from '../server/repositories/siteRepository'
import { createTestPrisma, seedNetwork, seedSite, seedSwitch } from './testHelpers'

describe('site delete cascade', () => {
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

  it('deletes a site with child entities and their activity entries', async () => {
    const site = await seedSite(prisma, { name: 'Branch' })
    const otherSite = await seedSite(prisma, { name: 'Other' })
    const sw = await seedSwitch(prisma, { site_id: site.id })
    const otherSw = await seedSwitch(prisma, { site_id: otherSite.id })
    const net = await seedNetwork(prisma, { site_id: site.id })
    const rangeId = 'range-1'
    const allocationId = 'alloc-1'
    const lagId = 'lag-1'
    const vlanId = 'vlan-1'
    const deletedPortId = 'port-deleted'
    const survivorPortId = 'port-survivor'

    await prisma.user.create({
      data: {
        id: 'user-1',
        username: 'tester',
        display_name: 'Tester',
        password_hash: 'hash',
        role: 'admin',
        language: 'en',
        is_setup_user: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    await prisma.layoutTemplate.create({
      data: {
        id: 'template-1',
        name: 'Template',
        units: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    await prisma.topologyLayout.create({
      data: { site_id: site.id, node_positions: '{}', updated_at: new Date().toISOString() }
    })
    await prisma.publicToken.create({
      data: { id: 'token-1', switch_id: sw.id, token: 'public-token', created_at: new Date().toISOString() }
    })
    await prisma.port.createMany({
      data: [
        { id: deletedPortId, switch_id: sw.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' },
        { id: survivorPortId, switch_id: otherSw.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]', connected_device_id: sw.id, connected_port_id: deletedPortId, connected_device: 'Switch', connected_port: '1/1' },
      ]
    })
    await prisma.vlan.create({
      data: {
        id: vlanId,
        site_id: site.id,
        vlan_id: 10,
        name: 'Users',
        status: 'active',
        color: '#ffffff',
        is_favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    await prisma.ipRange.create({
      data: {
        id: rangeId,
        network_id: net.id,
        start_ip: '10.0.1.10',
        end_ip: '10.0.1.20',
        type: 'dhcp',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    await prisma.ipAllocation.create({
      data: {
        id: allocationId,
        network_id: net.id,
        ip_address: '10.0.1.30',
        status: 'reserved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    await prisma.lagGroup.create({
      data: {
        id: lagId,
        switch_id: sw.id,
        name: 'LAG1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    await prisma.activityEntry.createMany({
      data: [
        { id: 'act-site', user_id: null, action: 'update', entity_type: 'site', entity_id: site.id, entity_name: 'Branch', timestamp: new Date().toISOString() },
        { id: 'act-switch', user_id: null, action: 'update', entity_type: 'switch', entity_id: sw.id, entity_name: 'Switch', timestamp: new Date().toISOString() },
        { id: 'act-port', user_id: null, action: 'update', entity_type: 'port', entity_id: deletedPortId, entity_name: 'Port', timestamp: new Date().toISOString() },
        { id: 'act-network', user_id: null, action: 'update', entity_type: 'network', entity_id: net.id, entity_name: 'Network', timestamp: new Date().toISOString() },
        { id: 'act-vlan', user_id: null, action: 'update', entity_type: 'vlan', entity_id: vlanId, entity_name: 'VLAN', timestamp: new Date().toISOString() },
        { id: 'act-range', user_id: null, action: 'update', entity_type: 'ip_range', entity_id: rangeId, entity_name: 'Range', timestamp: new Date().toISOString() },
        { id: 'act-allocation', user_id: null, action: 'update', entity_type: 'ip_allocation', entity_id: allocationId, entity_name: 'Allocation', timestamp: new Date().toISOString() },
        { id: 'act-lag', user_id: null, action: 'update', entity_type: 'lag_group', entity_id: lagId, entity_name: 'LAG', timestamp: new Date().toISOString() },
        { id: 'act-token', user_id: null, action: 'update', entity_type: 'public_token', entity_id: 'token-1', entity_name: 'Token', timestamp: new Date().toISOString() },
        { id: 'act-topology', user_id: null, action: 'update', entity_type: 'topology_layout', entity_id: site.id, entity_name: 'Topology', timestamp: new Date().toISOString() },
        { id: 'act-global', user_id: null, action: 'update', entity_type: 'layout_template', entity_id: 'template-1', entity_name: 'Template', timestamp: new Date().toISOString() },
      ]
    })

    await deleteSite({ context: { params: { id: site.id }, auth: { userId: 'tester' } } })

    expect(await prisma.site.findMany({ select: { id: true } })).toEqual([{ id: otherSite.id }])
    expect(await prisma.switch.count()).toBe(1)
    expect(await prisma.network.count()).toBe(0)
    expect(await prisma.vlan.count()).toBe(0)
    expect(await prisma.ipRange.count()).toBe(0)
    expect(await prisma.ipAllocation.count()).toBe(0)
    expect(await prisma.lagGroup.count()).toBe(0)
    expect(await prisma.publicToken.count()).toBe(0)
    expect(await prisma.topologyLayout.count()).toBe(0)
    expect(await prisma.layoutTemplate.count()).toBe(1)
    expect(await prisma.user.count()).toBe(1)
    expect(await prisma.port.findUnique({ where: { id: survivorPortId } })).toMatchObject({
      connected_device_id: null,
      connected_port_id: null,
      connected_device: null,
      connected_port: null,
    })
    expect(await prisma.activityEntry.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).toEqual([{ id: 'act-global' }])
  })

  it('does not return success when the repository delete misses the site', async () => {
    const site = await seedSite(prisma, { name: 'Race' })
    const deleteSpy = vi.spyOn(siteRepository, 'delete').mockResolvedValueOnce(false)

    await expect(deleteSite({ context: { params: { id: site.id }, auth: { userId: 'tester' } } }))
      .rejects
      .toMatchObject({ statusCode: 404 })

    deleteSpy.mockRestore()
  })
})
