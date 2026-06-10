import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { switchRepository } from '../server/repositories/switchRepository'

describe('switchRepository.update clears tags when tags: [] (regression for #182)', () => {
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

  it('removes all tags when updated with tags: []', async () => {
    const { id } = await seedSwitch(prisma, { site_id: siteId })
    await prisma.switch.update({ where: { id }, data: { tags: JSON.stringify(['wifi', 'core']) } })

    const updated = await switchRepository.update(id, { tags: [] })
    expect(updated.tags).toEqual([])
  })

  it('keeps existing tags unchanged when tags is omitted from update', async () => {
    const { id } = await seedSwitch(prisma, { site_id: siteId })
    await prisma.switch.update({ where: { id }, data: { tags: JSON.stringify(['mgmt']) } })

    const updated = await switchRepository.update(id, { name: 'Renamed' })
    expect(updated.tags).toEqual(['mgmt'])
  })

  it('replaces tags with a new set', async () => {
    const { id } = await seedSwitch(prisma, { site_id: siteId })
    await prisma.switch.update({ where: { id }, data: { tags: JSON.stringify(['old-tag']) } })

    const updated = await switchRepository.update(id, { tags: ['new-tag', 'another'] })
    expect(updated.tags).toEqual(['new-tag', 'another'])
  })
})
