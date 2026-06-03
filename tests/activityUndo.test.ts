import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { siteRepository } from '../server/repositories/siteRepository'
import { vlanRepository } from '../server/repositories/vlanRepository'
import { networkRepository } from '../server/repositories/networkRepository'
import { ipAllocationRepository } from '../server/repositories/ipAllocationRepository'
import { activityRepository } from '../server/repositories/activityRepository'
import undoHandler from '../server/api/activity/[id]/undo.post'

interface FakeEvent {
  context: { params?: { id?: string }, auth?: { userId: string } }
}

function makeEvent(activityId: string): FakeEvent {
  return { context: { params: { id: activityId }, auth: { userId: '' } } }
}

describe('activity/[id]/undo', () => {
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

  it('undoes a "create site" by deleting the site', async () => {
    const site = await siteRepository.create({ name: 'New Site' })
    const log = await activityRepository.log({
      user_id: '',
      action: 'create',
      entity_type: 'site',
      entity_id: site.id,
      entity_name: site.name
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (undoHandler as any)(makeEvent(log.id))
    expect(result.success).toBe(true)
    expect(await siteRepository.getById(site.id)).toBe(null)
  })

  it('undoes a "update network" by restoring previous_state', async () => {
    const network = await networkRepository.create({
      site_id: siteId,
      name: 'Original',
      subnet: '10.0.0.0/24',
      gateway: '10.0.0.1',
      dns_servers: []
    })

    // Snapshot the *current* state, then mutate, then undo.
    const previous_state: Record<string, unknown> = {
      id: network.id,
      site_id: network.site_id,
      name: network.name,
      subnet: network.subnet,
      gateway: network.gateway,
      vlan_id: network.vlan_id ?? null,
      dns_servers: network.dns_servers,
      description: network.description ?? null,
      is_favorite: network.is_favorite,
      created_at: network.created_at,
      updated_at: network.updated_at
    }
    await networkRepository.update(network.id, { name: 'Renamed' })

    const log = await activityRepository.log({
      user_id: '',
      action: 'update',
      entity_type: 'network',
      entity_id: network.id,
      entity_name: network.name,
      previous_state
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (undoHandler as any)(makeEvent(log.id))
    const restored = await networkRepository.getById(network.id)
    expect(restored?.name).toBe('Original')
  })

  it('undoes a "delete ip_allocation" by recreating with previous_state', async () => {
    const network = await networkRepository.create({
      site_id: siteId,
      name: 'N',
      subnet: '10.0.1.0/24',
      gateway: '10.0.1.1',
      dns_servers: []
    })
    const alloc = await ipAllocationRepository.create(network.id, { ip_address: '10.0.1.10', status: 'active' })

    const previous_state: Record<string, unknown> = {
      id: alloc.id,
      network_id: alloc.network_id,
      ip_address: alloc.ip_address,
      hostname: alloc.hostname ?? null,
      mac_address: alloc.mac_address ?? null,
      device_type: alloc.device_type ?? null,
      description: alloc.description ?? null,
      status: alloc.status,
      created_at: alloc.created_at,
      updated_at: alloc.updated_at
    }
    await ipAllocationRepository.delete(alloc.id)

    const log = await activityRepository.log({
      user_id: '',
      action: 'delete',
      entity_type: 'ip_allocation',
      entity_id: alloc.id,
      entity_name: alloc.ip_address,
      previous_state
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (undoHandler as any)(makeEvent(log.id))
    const back = await ipAllocationRepository.getById(alloc.id)
    expect(back?.ip_address).toBe('10.0.1.10')
  })

  it('rejects undo for unsupported actions with 422', async () => {
    const log = await activityRepository.log({
      user_id: '',
      action: 'update_port',
      entity_type: 'switch',
      entity_id: randomUUID(),
      entity_name: 'sw-1'
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((undoHandler as any)(makeEvent(log.id)))
      .rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejects undo for unsupported entity_type with 422', async () => {
    const log = await activityRepository.log({
      user_id: '',
      action: 'create',
      entity_type: 'user',
      entity_id: randomUUID(),
      entity_name: 'someone'
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((undoHandler as any)(makeEvent(log.id)))
      .rejects.toMatchObject({ statusCode: 422 })
  })

  it('returns 404 for unknown activity id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((undoHandler as any)(makeEvent(randomUUID())))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('logs an undo entry after a successful undo', async () => {
    const vlan = await vlanRepository.create({
      site_id: siteId,
      vlan_id: 42,
      name: 'V42',
      status: 'active',
      color: '#EF4444'
    })
    const log = await activityRepository.log({
      user_id: '',
      action: 'create',
      entity_type: 'vlan',
      entity_id: vlan.id,
      entity_name: vlan.name
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (undoHandler as any)(makeEvent(log.id))

    const { entries } = await activityRepository.list()
    const undoEntry = entries.find(e =>
      e.metadata && (e.metadata as { undid_entry_id?: string }).undid_entry_id === log.id
    )
    expect(undoEntry).toBeTruthy()
  })
})
