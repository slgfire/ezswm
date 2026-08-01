import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSwitch } from './testHelpers'
import bulkUpdatePorts from '../server/api/switches/[id]/ports/bulk.put'

describe('PUT /api/switches/:id/ports/bulk LAG protection', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>

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
    const now = new Date().toISOString()
    await prisma.user.create({ data: {
      id: 'test-user', username: 'route-test', display_name: 'Route Test', password_hash: 'unused',
      role: 'admin', language: 'en', is_setup_user: false, created_at: now, updated_at: now
    } })
  })

  async function fixture(lagIds: Array<string | null>) {
    const sw = await seedSwitch(prisma)
    const lagId = randomUUID()
    await prisma.lagGroup.create({
      data: { id: lagId, switch_id: sw.id, name: 'LAG 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    })
    const ports = await Promise.all(lagIds.map((lag_group_id, index) => prisma.port.create({
      data: {
        id: randomUUID(), switch_id: sw.id, unit: 1, index: index + 1, type: 'rj45', status: 'down',
        tagged_vlans: '[]', description: `original ${index}`, lag_group_id: lag_group_id === 'none' ? null : (lag_group_id || lagId)
      }
    })))
    return { sw, lagId, ports }
  }

  async function call(switchId: string, portIds: string[], body: Record<string, unknown>) {
    const { updates, ...rest } = body as { updates?: Record<string, unknown> }
    return bulkUpdatePorts({
      context: { params: { id: switchId }, auth: { userId: 'test-user' } },
      query: {}, body: { port_ids: portIds, updates: updates ?? { description: 'changed' }, ...rest }
    } as never)
  }

  it('rejects a missing lag_group_id without mutation', async () => {
    const { sw, lagId, ports } = await fixture([lagIdPlaceholder()])
    await expect(call(sw.id, [ports[0].id], {})).rejects.toMatchObject({ statusCode: 409 })
    const port = await prisma.port.findUniqueOrThrow({ where: { id: ports[0].id } })
    expect(port.lag_group_id).toBe(lagId)
    expect(port.description).toBe('original 0')
  })

  it('updates LAG-free targets when lag_group_id is omitted', async () => {
    const { sw, ports } = await fixture(['none'])
    await call(sw.id, [ports[0].id], {})
    const port = await prisma.port.findUniqueOrThrow({ where: { id: ports[0].id } })
    expect(port.description).toBe('changed')
    expect(port.lag_group_id).toBeNull()
  })

  it('rejects a wrong lag_group_id without mutation', async () => {
    const { sw, lagId, ports } = await fixture([lagIdPlaceholder()])
    await expect(call(sw.id, [ports[0].id], { lag_group_id: randomUUID() })).rejects.toMatchObject({ statusCode: 409 })
    const port = await prisma.port.findUniqueOrThrow({ where: { id: ports[0].id } })
    expect(port.lag_group_id).toBe(lagId)
    expect(port.description).toBe('original 0')
  })

  it('rejects mixed target LAG IDs without mutation', async () => {
    const { sw, lagId, ports } = await fixture([lagIdPlaceholder(), 'none'])
    await expect(call(sw.id, ports.map(port => port.id), { lag_group_id: lagId })).rejects.toMatchObject({ statusCode: 409 })
    const rows = await prisma.port.findMany({ where: { switch_id: sw.id }, orderBy: { index: 'asc' } })
    expect(rows.map(row => [row.lag_group_id, row.description])).toEqual([[lagId, 'original 0'], [null, 'original 1']])
  })

  it('updates all targets when the same LAG ID is supplied', async () => {
    const { sw, lagId, ports } = await fixture([lagIdPlaceholder(), lagIdPlaceholder()])
    await call(sw.id, ports.map(port => port.id), { lag_group_id: lagId })
    const rows = await prisma.port.findMany({ where: { switch_id: sw.id } })
    expect(rows).toHaveLength(2)
    expect(rows.every(row => row.description === 'changed' && row.lag_group_id === lagId)).toBe(true)
  })

  it('rejects apply_after_copy_prefill for LAG targets even with valid lag_group_id', async () => {
    const { sw, lagId, ports } = await fixture([lagIdPlaceholder(), lagIdPlaceholder()])
    await expect(call(sw.id, ports.map(port => port.id), {
      lag_group_id: lagId,
      apply_after_copy_prefill: true
    })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('keeps manual LAG apply behavior unchanged when apply_after_copy_prefill is false', async () => {
    const { sw, lagId, ports } = await fixture([lagIdPlaceholder(), lagIdPlaceholder()])
    await call(sw.id, ports.map(port => port.id), {
      lag_group_id: lagId,
      apply_after_copy_prefill: false
    })
    const rows = await prisma.port.findMany({ where: { switch_id: sw.id } })
    expect(rows.every(row => row.description === 'changed' && row.lag_group_id === lagId)).toBe(true)
  })

  it('applies explicit VLAN clears (null and empty array) without truthiness loss', async () => {
    const { sw, ports } = await fixture(['none'])
    await prisma.port.update({
      where: { id: ports[0].id },
      data: {
        port_mode: 'trunk',
        native_vlan: 100,
        tagged_vlans: JSON.stringify([100, 200])
      }
    })

    await call(sw.id, [ports[0].id], {
      updates: {
        native_vlan: null,
        tagged_vlans: []
      }
    })

    const port = await prisma.port.findUniqueOrThrow({ where: { id: ports[0].id } })
    expect(port.native_vlan).toBeNull()
    expect(port.tagged_vlans).toBe('[]')
  })

  function lagIdPlaceholder(): string {
    // fixture replaces this marker with the actual seeded LAG ID below.
    return ''
  }
})
