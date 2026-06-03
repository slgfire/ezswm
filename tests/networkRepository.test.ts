import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { networkRepository } from '../server/repositories/networkRepository'

describe('networkRepository', () => {
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

  const validNetwork = () => ({
    site_id: siteId,
    name: 'Test Network',
    subnet: '10.0.1.0/24',
    gateway: '10.0.1.1',
    dns_servers: ['8.8.8.8'],
    is_favorite: false,
  })

  describe('create', () => {
    it('creates network with valid CIDR', async () => {
      const result = await networkRepository.create(validNetwork())
      expect(result.id).toBeTruthy()
      expect(result.name).toBe('Test Network')
      expect(result.subnet).toBe('10.0.1.0/24')
      expect(result.created_at).toBeTruthy()
    })

    it('rejects invalid CIDR', async () => {
      await expect(networkRepository.create({ ...validNetwork(), subnet: 'not-a-cidr' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects gateway outside subnet', async () => {
      await expect(networkRepository.create({ ...validNetwork(), gateway: '192.168.1.1' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Gateway/) })
    })

    it('rejects invalid gateway IP', async () => {
      await expect(networkRepository.create({ ...validNetwork(), gateway: '999.999.999.999' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects invalid DNS server IP', async () => {
      await expect(networkRepository.create({ ...validNetwork(), dns_servers: ['not-an-ip'] }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/DNS/) })
    })

    it('accepts network without gateway', async () => {
      const result = await networkRepository.create({ ...validNetwork(), gateway: undefined })
      expect(result.id).toBeTruthy()
    })

    it('accepts network with empty dns_servers', async () => {
      const result = await networkRepository.create({ ...validNetwork(), dns_servers: [] })
      expect(result.dns_servers).toEqual([])
    })
  })

  describe('getById', () => {
    it('returns network by id', async () => {
      const created = await networkRepository.create(validNetwork())
      const found = await networkRepository.getById(created.id)
      expect(found).toBeTruthy()
      expect(found!.id).toBe(created.id)
    })

    it('returns null for unknown id', async () => {
      expect(await networkRepository.getById('00000000-0000-4000-8000-000000000000')).toBe(null)
    })
  })

  describe('delete', () => {
    it('removes network', async () => {
      const created = await networkRepository.create(validNetwork())
      expect(await networkRepository.delete(created.id)).toBe(true)
      expect(await networkRepository.getById(created.id)).toBe(null)
    })

    it('returns false for unknown id', async () => {
      expect(await networkRepository.delete('00000000-0000-4000-8000-000000000000')).toBe(false)
    })
  })
})
