import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedSwitch, seedNetwork } from './testHelpers'
import { switchRepository } from '../server/repositories/switchRepository'
import { networkRepository } from '../server/repositories/networkRepository'

/**
 * The `@@unique([site_id, slug])` constraint allows the same slug to exist on
 * different sites. Lookups by slug without site context return null in that
 * case (by design — there's no canonical winner). Passing the site_id as the
 * second arg must always pick the correct row, on both get and write paths.
 */
describe('slug-collision disambiguation via siteId', () => {
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

  beforeEach(async () => { await resetDb() })

  describe('switchRepository', () => {
    it('getByIdOrSlug picks the right switch when same slug exists on two sites', async () => {
      const siteA = await seedSite(prisma, { name: 'A' })
      const siteB = await seedSite(prisma, { name: 'B' })
      const swA = await seedSwitch(prisma, { site_id: siteA.id, slug: 'sw-core', name: 'A-core' })
      const swB = await seedSwitch(prisma, { site_id: siteB.id, slug: 'sw-core', name: 'B-core' })

      const resA = await switchRepository.getByIdOrSlug('sw-core', siteA.id)
      const resB = await switchRepository.getByIdOrSlug('sw-core', siteB.id)

      expect(resA?.id).toBe(swA.id)
      expect(resB?.id).toBe(swB.id)
    })

    it('getByIdOrSlug returns null on ambiguous slug without siteId', async () => {
      const siteA = await seedSite(prisma)
      const siteB = await seedSite(prisma)
      await seedSwitch(prisma, { site_id: siteA.id, slug: 'sw-core' })
      await seedSwitch(prisma, { site_id: siteB.id, slug: 'sw-core' })

      const res = await switchRepository.getByIdOrSlug('sw-core')
      expect(res).toBeNull()
    })

    it('getByIdOrSlug still resolves a unique global slug without siteId', async () => {
      const site = await seedSite(prisma)
      const sw = await seedSwitch(prisma, { site_id: site.id, slug: 'unique-one' })

      const res = await switchRepository.getByIdOrSlug('unique-one')
      expect(res?.id).toBe(sw.id)
    })

    it('update accepts ambiguous slug + siteId and patches the right row', async () => {
      const siteA = await seedSite(prisma)
      const siteB = await seedSite(prisma)
      const swA = await seedSwitch(prisma, { site_id: siteA.id, slug: 'sw-core', name: 'A' })
      const swB = await seedSwitch(prisma, { site_id: siteB.id, slug: 'sw-core', name: 'B' })

      const updated = await switchRepository.update('sw-core', { notes: 'patched-B' }, siteB.id)

      expect(updated.id).toBe(swB.id)
      const a = await prisma.switch.findUnique({ where: { id: swA.id } })
      const b = await prisma.switch.findUnique({ where: { id: swB.id } })
      expect(a?.notes).toBe(null)
      expect(b?.notes).toBe('patched-B')
    })

    it('delete accepts ambiguous slug + siteId and removes the right row', async () => {
      const siteA = await seedSite(prisma)
      const siteB = await seedSite(prisma)
      const swA = await seedSwitch(prisma, { site_id: siteA.id, slug: 'sw-core' })
      const swB = await seedSwitch(prisma, { site_id: siteB.id, slug: 'sw-core' })

      const ok = await switchRepository.delete('sw-core', siteB.id)

      expect(ok).toBe(true)
      expect(await prisma.switch.findUnique({ where: { id: swA.id } })).not.toBeNull()
      expect(await prisma.switch.findUnique({ where: { id: swB.id } })).toBeNull()
    })

    it('update without siteId throws 404 on ambiguous slug instead of mutating a random row', async () => {
      const siteA = await seedSite(prisma)
      const siteB = await seedSite(prisma)
      await seedSwitch(prisma, { site_id: siteA.id, slug: 'sw-core' })
      await seedSwitch(prisma, { site_id: siteB.id, slug: 'sw-core' })

      await expect(switchRepository.update('sw-core', { notes: 'x' })).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('networkRepository', () => {
    it('getByIdOrSlug picks the right network when same slug exists on two sites', async () => {
      const siteA = await seedSite(prisma)
      const siteB = await seedSite(prisma)
      const netA = await seedNetwork(prisma, { site_id: siteA.id, slug: 'lan', name: 'A', subnet: '10.0.0.0/24', gateway: '10.0.0.1' })
      const netB = await seedNetwork(prisma, { site_id: siteB.id, slug: 'lan', name: 'B', subnet: '10.1.0.0/24', gateway: '10.1.0.1' })

      const resA = await networkRepository.getByIdOrSlug('lan', siteA.id)
      const resB = await networkRepository.getByIdOrSlug('lan', siteB.id)

      expect(resA?.id).toBe(netA.id)
      expect(resB?.id).toBe(netB.id)
    })

    it('update + delete disambiguate via siteId', async () => {
      const siteA = await seedSite(prisma)
      const siteB = await seedSite(prisma)
      const netA = await seedNetwork(prisma, { site_id: siteA.id, slug: 'lan', name: 'A', subnet: '10.0.0.0/24', gateway: '10.0.0.1' })
      const netB = await seedNetwork(prisma, { site_id: siteB.id, slug: 'lan', name: 'B', subnet: '10.1.0.0/24', gateway: '10.1.0.1' })

      const updated = await networkRepository.update('lan', { description: 'patched-B' }, siteB.id)
      expect(updated.id).toBe(netB.id)
      expect(updated.description).toBe('patched-B')
      const a = await prisma.network.findUnique({ where: { id: netA.id } })
      expect(a?.description).toBe(null)

      const ok = await networkRepository.delete('lan', siteA.id)
      expect(ok).toBe(true)
      expect(await prisma.network.findUnique({ where: { id: netA.id } })).toBeNull()
      expect(await prisma.network.findUnique({ where: { id: netB.id } })).not.toBeNull()
    })
  })
})
