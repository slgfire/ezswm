import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma } from './testHelpers'
import { siteRepository } from '../server/repositories/siteRepository'

describe('siteRepository slug behavior', () => {
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

  it('mints a slug from name on create', async () => {
    const site = await siteRepository.create({ name: 'Main Office' })
    expect(site.slug).toBe('main-office')
  })

  it('appends -2 on slug collision', async () => {
    await siteRepository.create({ name: 'HQ' })
    const second = await siteRepository.create({ name: 'HQ' })
    expect(second.slug).toBe('hq-2')
  })

  it('transliterates umlauts in slug', async () => {
    const site = await siteRepository.create({ name: 'München' })
    expect(site.slug).toBe('muenchen')
  })

  it('getById accepts UUID', async () => {
    const created = await siteRepository.create({ name: 'X' })
    const found = await siteRepository.getById(created.id)
    expect(found?.id).toBe(created.id)
  })

  it('getById accepts slug as fallback', async () => {
    const created = await siteRepository.create({ name: 'Reachable' })
    const found = await siteRepository.getById(created.slug)
    expect(found?.id).toBe(created.id)
    expect(found?.slug).toBe('reachable')
  })

  it('getBySlug returns null for unknown slug', async () => {
    expect(await siteRepository.getBySlug('nope')).toBe(null)
  })

  it('update accepts an explicit slug change', async () => {
    const created = await siteRepository.create({ name: 'Original' })
    const updated = await siteRepository.update(created.id, { slug: 'renamed' })
    expect(updated.slug).toBe('renamed')
    expect(await siteRepository.getBySlug('renamed')).not.toBe(null)
    expect(await siteRepository.getBySlug('original')).toBe(null)
  })

  it('update does NOT change slug when only name changes', async () => {
    const created = await siteRepository.create({ name: 'Stable' })
    const updated = await siteRepository.update(created.id, { name: 'Renamed in UI' })
    expect(updated.slug).toBe('stable') // unchanged — slug is sticky
    expect(updated.name).toBe('Renamed in UI')
  })

  it('update collision: appends -2 if the new slug is already taken', async () => {
    await siteRepository.create({ name: 'Taken' })
    const other = await siteRepository.create({ name: 'Other' })
    const updated = await siteRepository.update(other.id, { slug: 'taken' })
    expect(updated.slug).toBe('taken-2')
  })
})
