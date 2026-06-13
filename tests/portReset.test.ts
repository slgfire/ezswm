import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSwitch } from './testHelpers'
import { switchRepository } from '../server/repositories/switchRepository'

describe('switchRepository.resetPort', () => {
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

  it('clears the local port and severs the link on both ends, keeping peer config', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' })
    const s2 = await seedSwitch(prisma, { name: 'S2' })

    const portB = await prisma.port.create({
      data: {
        id: randomUUID(), switch_id: s2.id, unit: 1, index: 1, type: 'rj45',
        status: 'up', tagged_vlans: '[]', speed: '1G', native_vlan: 100,
        description: 'keep me'
      }
    })
    const portA = await prisma.port.create({
      data: {
        id: randomUUID(), switch_id: s1.id, unit: 1, index: 1, type: 'rj45',
        status: 'up', tagged_vlans: '[20]', speed: '10G', port_mode: 'access',
        access_vlan: 50, native_vlan: 10, description: 'A desc',
        mac_address: 'aa:bb:cc:dd:ee:ff',
        connected_device: 'S2', connected_device_id: s2.id,
        connected_port_id: portB.id, connected_port: 'B'
      }
    })
    // Reciprocal link B -> A
    await prisma.port.update({
      where: { id: portB.id },
      data: {
        connected_device: 'S1', connected_device_id: s1.id,
        connected_port_id: portA.id, connected_port: 'A'
      }
    })

    await switchRepository.resetPort(s1.id, portA.id)

    const a = await prisma.port.findUnique({ where: { id: portA.id } })
    const b = await prisma.port.findUnique({ where: { id: portB.id } })

    // Local port A fully reset
    expect(a?.status).toBe('down')
    expect(a?.speed).toBeNull()
    expect(a?.port_mode).toBeNull()
    expect(a?.access_vlan).toBeNull()
    expect(a?.native_vlan).toBeNull()
    expect(a?.tagged_vlans).toBe('[]')
    expect(a?.description).toBeNull()
    expect(a?.mac_address).toBeNull()
    expect(a?.connected_device).toBeNull()
    expect(a?.connected_device_id).toBeNull()
    expect(a?.connected_port_id).toBeNull()
    expect(a?.connected_port).toBeNull()

    // Peer port B: link severed, own config kept
    expect(b?.connected_device).toBeNull()
    expect(b?.connected_device_id).toBeNull()
    expect(b?.connected_port_id).toBeNull()
    expect(b?.connected_port).toBeNull()
    expect(b?.status).toBe('up')
    expect(b?.speed).toBe('1G')
    expect(b?.native_vlan).toBe(100)
    expect(b?.description).toBe('keep me')
  })

  it('resets a port with no connection without touching other ports', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' })
    const portA = await prisma.port.create({
      data: {
        id: randomUUID(), switch_id: s1.id, unit: 1, index: 1, type: 'rj45',
        status: 'up', tagged_vlans: '[]', speed: '10G', description: 'standalone'
      }
    })

    const result = await switchRepository.resetPort(s1.id, portA.id)
    expect(result.status).toBe('down')
    expect(result.speed).toBeUndefined()
    expect(result.description).toBeUndefined()
  })
})
