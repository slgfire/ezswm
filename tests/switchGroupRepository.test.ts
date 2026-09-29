import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { switchGroupRepository } from '../server/repositories/switchGroupRepository'
import { switchRepository } from '../server/repositories/switchRepository'

describe('switchGroupRepository', () => {
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

  it('supports CRUD lifecycle', async () => {
    const { id: siteId } = await seedSite(prisma, { slug: 'hq' })

    const created = await switchGroupRepository.create({ site_id: siteId, name: 'Core' })
    expect(created.site_id).toBe(siteId)
    expect(created.slug).toBe('core')

    const listed = await switchGroupRepository.list(siteId)
    expect(listed.map(group => group.id)).toEqual([created.id])

    const got = await switchGroupRepository.getByIdOrSlug('core', siteId)
    expect(got?.id).toBe(created.id)

    const updated = await switchGroupRepository.update(created.id, { name: 'Distribution' })
    expect(updated.name).toBe('Distribution')
    expect(updated.slug).toBe('distribution')

    expect(await switchGroupRepository.delete(created.id)).toBe(true)
    expect(await switchGroupRepository.getById(created.id)).toBeNull()
  })


  it('maps unique-index race (P2002) to clean 409 on create', async () => {
    const { id: siteId } = await seedSite(prisma)

    const createSpy = vi.spyOn(prisma.switchGroup, 'create')
      .mockRejectedValueOnce({ code: 'P2002' } as never)

    await expect(switchGroupRepository.create({ site_id: siteId, name: 'Race Group' }))
      .rejects.toMatchObject({
        statusCode: 409,
        message: "Switch group name 'Race Group' already exists in this site"
      })

    createSpy.mockRestore()
  })

  it('returns clean 409 for same-site duplicate names', async () => {
    const { id: siteId } = await seedSite(prisma)
    const { id: otherSiteId } = await seedSite(prisma)

    await switchGroupRepository.create({ site_id: siteId, name: 'Access' })

    await expect(switchGroupRepository.create({ site_id: siteId, name: 'Access' }))
      .rejects.toMatchObject({ statusCode: 409 })

    await expect(switchGroupRepository.create({ site_id: otherSiteId, name: 'Access' }))
      .resolves.toMatchObject({ site_id: otherSiteId, name: 'Access' })
  })

  it('updates sort order in provided order', async () => {
    const { id: siteId } = await seedSite(prisma)
    const a = await switchGroupRepository.create({ site_id: siteId, name: 'A' })
    const b = await switchGroupRepository.create({ site_id: siteId, name: 'B' })
    const c = await switchGroupRepository.create({ site_id: siteId, name: 'C' })

    await switchGroupRepository.updateSortOrder([c.id, a.id, b.id])

    const rows = await switchGroupRepository.list(siteId)
    expect(rows.map(group => group.id)).toEqual([c.id, a.id, b.id])
    expect(rows.map(group => group.sort_order)).toEqual([0, 1, 2])
  })

  it('deleting a group silently ungroups switches (ON DELETE SET NULL)', async () => {
    const { id: siteId } = await seedSite(prisma)
    const group = await switchGroupRepository.create({ site_id: siteId, name: 'Edge' })
    const { id: switchId } = await seedSwitch(prisma, { site_id: siteId, group_id: group.id })

    await switchGroupRepository.delete(group.id)

    const sw = await prisma.switch.findUnique({ where: { id: switchId } })
    expect(sw?.group_id).toBeNull()
  })

  it('rejects cross-site group assignment on switch create and update', async () => {
    const { id: siteA } = await seedSite(prisma, { slug: 'a' })
    const { id: siteB } = await seedSite(prisma, { slug: 'b' })
    const groupB = await switchGroupRepository.create({ site_id: siteB, name: 'Remote' })

    await expect(switchRepository.create({
      site_id: siteA,
      name: 'sw-a',
      group_id: groupB.id,
      tags: [],
      configured_vlans: []
    })).rejects.toMatchObject({ statusCode: 422 })

    const sw = await switchRepository.create({
      site_id: siteA,
      name: 'sw-local',
      tags: [],
      configured_vlans: []
    })

    await expect(switchRepository.update(sw.id, { group_id: groupB.id }))
      .rejects.toMatchObject({ statusCode: 422 })
  })
})
