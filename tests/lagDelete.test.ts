import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSwitch } from './testHelpers'
import { lagGroupRepository } from '../server/repositories/lagGroupRepository'

describe('lagGroupRepository.delete', () => {
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

  it('clears the inter-switch links on both ends when the LAG is deleted', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' })
    const s2 = await seedSwitch(prisma, { name: 'S2' })

    const portB = await prisma.port.create({
      data: { id: randomUUID(), switch_id: s2.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' }
    })
    const portA = await prisma.port.create({
      data: {
        id: randomUUID(), switch_id: s1.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]',
        connected_device: 'S2', connected_device_id: s2.id, connected_port_id: portB.id, connected_port: 'B'
      }
    })
    await prisma.port.update({
      where: { id: portB.id },
      data: { connected_device: 'S1', connected_device_id: s1.id, connected_port_id: portA.id, connected_port: 'A' }
    })

    const lag = await lagGroupRepository.create(s1.id, {
      name: 'lag1', port_ids: [portA.id], remote_device: 'S2', remote_device_id: s2.id
    })

    const ok = await lagGroupRepository.delete(lag.id)
    expect(ok).toBe(true)

    const a = await prisma.port.findUnique({ where: { id: portA.id } })
    const b = await prisma.port.findUnique({ where: { id: portB.id } })

    // Member port: link gone + detached from LAG
    expect(a?.connected_device_id).toBeNull()
    expect(a?.connected_port_id).toBeNull()
    expect(a?.connected_device).toBeNull()
    expect(a?.connected_port).toBeNull()
    expect(a?.lag_group_id).toBeNull()

    // Peer port: link gone
    expect(b?.connected_device_id).toBeNull()
    expect(b?.connected_port_id).toBeNull()
    expect(b?.connected_device).toBeNull()
    expect(b?.connected_port).toBeNull()
  })

  it('deletes a LAG without connections without error', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' })
    const portA = await prisma.port.create({
      data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' }
    })
    const lag = await lagGroupRepository.create(s1.id, { name: 'lag1', port_ids: [portA.id] })
    expect(await lagGroupRepository.delete(lag.id)).toBe(true)
    const a = await prisma.port.findUnique({ where: { id: portA.id } })
    expect(a?.lag_group_id).toBeNull()
  })
})
