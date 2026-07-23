import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSwitch } from './testHelpers'
import { lagGroupRepository } from '../server/repositories/lagGroupRepository'
import deleteLagGroup from '../server/api/switches/[id]/lag-groups/[lagId].delete'

describe('DELETE /switches/:id/lag-groups/:lagId authorization', () => {
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

  it('returns 404 and does not delete a LAG belonging to another switch', async () => {
    const switchA = await seedSwitch(prisma, { name: 'A' })
    const switchB = await seedSwitch(prisma, { name: 'B' })
    const ports = await Promise.all([1, 2].map(index => prisma.port.create({
      data: { id: randomUUID(), switch_id: switchB.id, unit: 1, index, type: 'rj45', status: 'up', tagged_vlans: '[]' }
    })))
    const lag = await lagGroupRepository.create(switchB.id, { name: 'B-LAG', port_ids: ports.map(port => port.id) })

    await expect(deleteLagGroup({
      context: { params: { id: switchA.id, lagId: lag.id }, auth: { userId: 'test-user' } },
      query: {},
      body: {}
    } as never)).rejects.toMatchObject({ statusCode: 404 })

    expect(await prisma.lagGroup.findUnique({ where: { id: lag.id } })).not.toBeNull()
    expect(await prisma.port.findMany({ where: { id: { in: ports.map(port => port.id) } } })).toEqual(
      expect.arrayContaining(ports.map(port => expect.objectContaining({ id: port.id, lag_group_id: lag.id })))
    )
  })
})
