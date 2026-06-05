import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedNetwork, seedSwitch } from './testHelpers'
import { siteRepository } from '../server/repositories/siteRepository'
import { networkRepository } from '../server/repositories/networkRepository'
import { switchRepository } from '../server/repositories/switchRepository'

describe('update / delete accept slug as well as UUID (regression for #170)', () => {
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

  it('siteRepository.update accepts the slug', async () => {
    const { id } = await seedSite(prisma, { slug: 'hq', name: 'HQ' })
    const updated = await siteRepository.update('hq', { description: 'changed' })
    expect(updated.id).toBe(id)
    expect(updated.description).toBe('changed')
  })

  it('siteRepository.delete accepts the slug', async () => {
    await seedSite(prisma, { slug: 'goner', name: 'Goner' })
    expect(await siteRepository.delete('goner')).toBe(true)
    expect(await siteRepository.getById('goner')).toBe(null)
  })

  it('siteRepository.update via UUID still works', async () => {
    const { id } = await seedSite(prisma, { slug: 'classic', name: 'Classic' })
    const updated = await siteRepository.update(id, { name: 'Classic Renamed' })
    expect(updated.name).toBe('Classic Renamed')
    expect(updated.slug).toBe('classic-renamed') // slug follows name
  })

  it('networkRepository.update accepts the slug', async () => {
    const { id: siteId } = await seedSite(prisma)
    const { id } = await seedNetwork(prisma, { site_id: siteId, slug: 'mgmt', name: 'Mgmt' })
    const updated = await networkRepository.update('mgmt', { description: 'now described' })
    expect(updated.id).toBe(id)
    expect(updated.description).toBe('now described')
  })

  it('networkRepository.delete accepts the slug', async () => {
    const { id: siteId } = await seedSite(prisma)
    await seedNetwork(prisma, { site_id: siteId, slug: 'kill-me', name: 'Kill me' })
    expect(await networkRepository.delete('kill-me')).toBe(true)
  })

  it('switchRepository.update accepts the slug', async () => {
    const { id: siteId } = await seedSite(prisma)
    const { id } = await seedSwitch(prisma, { site_id: siteId, slug: 'core-01', name: 'Core 01' })
    const updated = await switchRepository.update('core-01', { manufacturer: 'Cisco' })
    expect(updated.id).toBe(id)
    expect(updated.manufacturer).toBe('Cisco')
  })

  it('switchRepository.delete accepts the slug', async () => {
    const { id: siteId } = await seedSite(prisma)
    await seedSwitch(prisma, { site_id: siteId, slug: 'doomed', name: 'Doomed' })
    expect(await switchRepository.delete('doomed')).toBe(true)
  })

  it('update with unknown slug returns 404 cleanly', async () => {
    await expect(siteRepository.update('does-not-exist', { name: 'x' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})
