import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { vlanRepository } from '../server/repositories/vlanRepository'

describe('vlanRepository', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteId1: string
  let siteId2: string

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
    siteId1 = (await seedSite(prisma, { name: 'Site 1' })).id
    siteId2 = (await seedSite(prisma, { name: 'Site 2' })).id
  })

  const validVlan = () => ({
    site_id: siteId1,
    vlan_id: 100,
    name: 'Management',
    status: 'active' as const,
    color: '#EF4444',
  })

  describe('create', () => {
    it('creates VLAN and returns it with id', async () => {
      const result = await vlanRepository.create(validVlan())
      expect(result.id).toBeTruthy()
      expect(result.vlan_id).toBe(100)
      expect(result.name).toBe('Management')
      expect(result.is_favorite).toBe(false)
      expect(result.created_at).toBeTruthy()
    })

    it('rejects duplicate VLAN ID in same site', async () => {
      await vlanRepository.create(validVlan())
      await expect(vlanRepository.create({ ...validVlan(), color: '#F97316' }))
        .rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/VLAN ID 100/) })
    })

    it('allows same VLAN ID in different sites', async () => {
      await vlanRepository.create(validVlan())
      const result = await vlanRepository.create({ ...validVlan(), site_id: siteId2, color: '#F97316' })
      expect(result.id).toBeTruthy()
      expect(result.site_id).toBe(siteId2)
    })

    it('rejects duplicate color in same site', async () => {
      await vlanRepository.create(validVlan())
      await expect(vlanRepository.create({ ...validVlan(), vlan_id: 200 }))
        .rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/Color/) })
    })
  })

  describe('getNextAvailableColor', () => {
    it('returns first pool color when no VLANs exist', async () => {
      const color = await vlanRepository.getNextAvailableColor()
      expect(color).toBe('#EF4444')
    })

    it('returns second pool color when first is taken', async () => {
      await vlanRepository.create(validVlan())
      const color = await vlanRepository.getNextAvailableColor()
      expect(color).toBe('#F97316')
    })
  })

  describe('delete', () => {
    it('removes VLAN', async () => {
      const created = await vlanRepository.create(validVlan())
      expect(await vlanRepository.delete(created.id)).toBe(true)
      expect(await vlanRepository.getById(created.id)).toBe(null)
    })

    it('returns false for unknown id', async () => {
      expect(await vlanRepository.delete('00000000-0000-4000-8000-000000000000')).toBe(false)
    })
  })
})
