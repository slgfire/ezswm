import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSwitch } from './testHelpers'
import publicSwitchHandler from '../server/api/p/[token].get'
import { publicTokenRepository } from '../server/repositories/publicTokenRepository'

describe('GET /api/p/:token lag_group_name projection', () => {
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
  })

  it('exposes only lag_group_name for LAG ports in public projection', async () => {
    const sw = await seedSwitch(prisma)
    const now = new Date().toISOString()
    const lagId = randomUUID()

    await prisma.lagGroup.create({
      data: {
        id: lagId,
        switch_id: sw.id,
        name: 'Uplink Aggregation Alpha',
        remote_device: 'secret-peer-name',
        remote_device_id: randomUUID(),
        description: 'private notes',
        created_at: now,
        updated_at: now
      }
    })

    await prisma.port.create({
      data: {
        id: randomUUID(),
        switch_id: sw.id,
        unit: 1,
        index: 1,
        type: 'rj45',
        status: 'down',
        tagged_vlans: '[]',
        lag_group_id: lagId
      }
    })

    await prisma.port.create({
      data: {
        id: randomUUID(),
        switch_id: sw.id,
        unit: 1,
        index: 2,
        type: 'rj45',
        status: 'down',
        tagged_vlans: '[]'
      }
    })

    const token = await publicTokenRepository.create(sw.id)
    const result = await publicSwitchHandler({ context: { params: { token: token.token } } } as never) as { ports: Record<string, unknown>[] }

    const lagPort = result.ports.find(port => port.index === 1)
    const normalPort = result.ports.find(port => port.index === 2)

    expect(lagPort).toBeTruthy()
    expect(lagPort?.lag_group_name).toBe('Uplink Aggregation Alpha')
    expect(lagPort).not.toHaveProperty('lag_group_id')
    expect(lagPort).not.toHaveProperty('remote_device')
    expect(lagPort).not.toHaveProperty('remote_device_id')
    expect(lagPort).not.toHaveProperty('port_ids')

    expect(normalPort).toBeTruthy()
    expect(normalPort).not.toHaveProperty('lag_group_name')
  })
})
