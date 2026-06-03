import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedNetwork } from './testHelpers'
import { ipRangeRepository } from '../server/repositories/ipRangeRepository'

describe('ipRangeRepository', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let net1: string
  let net31: string
  let net32: string

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
    const { id: siteId } = await seedSite(prisma)
    net1 = (await seedNetwork(prisma, { site_id: siteId, name: 'Test Network', subnet: '10.0.1.0/24', gateway: '10.0.1.1' })).id
    net31 = (await seedNetwork(prisma, { site_id: siteId, name: 'PtP', subnet: '10.0.0.0/31', gateway: null })).id
    net32 = (await seedNetwork(prisma, { site_id: siteId, name: 'Host', subnet: '10.0.0.1/32', gateway: null })).id
  })

  describe('create', () => {
    it('creates a valid range', async () => {
      const result = await ipRangeRepository.create(net1, { start_ip: '10.0.1.10', end_ip: '10.0.1.50', type: 'dhcp' })
      expect(result.id).toBeTruthy()
      expect(result.start_ip).toBe('10.0.1.10')
      expect(result.end_ip).toBe('10.0.1.50')
      expect(result.type).toBe('dhcp')
    })

    it('rejects start > end', async () => {
      await expect(ipRangeRepository.create(net1, { start_ip: '10.0.1.100', end_ip: '10.0.1.10', type: 'static' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/less than/) })
    })

    it('rejects range outside subnet', async () => {
      await expect(ipRangeRepository.create(net1, { start_ip: '192.168.1.10', end_ip: '192.168.1.50', type: 'static' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects overlapping ranges', async () => {
      await ipRangeRepository.create(net1, { start_ip: '10.0.1.10', end_ip: '10.0.1.50', type: 'dhcp' })
      await expect(ipRangeRepository.create(net1, { start_ip: '10.0.1.40', end_ip: '10.0.1.80', type: 'static' }))
        .rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/overlaps/) })
    })

    it('rejects DHCP range on /31 network', async () => {
      await expect(ipRangeRepository.create(net31, { start_ip: '10.0.0.0', end_ip: '10.0.0.1', type: 'dhcp' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/point-to-point/) })
    })

    it('rejects DHCP range on /32 network', async () => {
      await expect(ipRangeRepository.create(net32, { start_ip: '10.0.0.1', end_ip: '10.0.0.1', type: 'dhcp' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/host-route/) })
    })

    it('allows static range on /31 network', async () => {
      const result = await ipRangeRepository.create(net31, { start_ip: '10.0.0.0', end_ip: '10.0.0.1', type: 'static' })
      expect(result.id).toBeTruthy()
    })

    it('rejects unknown network', async () => {
      await expect(ipRangeRepository.create('00000000-0000-4000-8000-000000000000', { start_ip: '10.0.1.10', end_ip: '10.0.1.50', type: 'dhcp' }))
        .rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('update', () => {
    it('updates range excluding self from overlap check', async () => {
      const created = await ipRangeRepository.create(net1, { start_ip: '10.0.1.10', end_ip: '10.0.1.50', type: 'dhcp' })
      const updated = await ipRangeRepository.update(created.id, { end_ip: '10.0.1.60' })
      expect(updated.end_ip).toBe('10.0.1.60')
    })
  })

  describe('delete', () => {
    it('removes range', async () => {
      const created = await ipRangeRepository.create(net1, { start_ip: '10.0.1.10', end_ip: '10.0.1.50', type: 'dhcp' })
      expect(await ipRangeRepository.delete(created.id)).toBe(true)
      expect(await ipRangeRepository.getById(created.id)).toBe(null)
    })

    it('returns false for unknown id', async () => {
      expect(await ipRangeRepository.delete('00000000-0000-4000-8000-000000000000')).toBe(false)
    })
  })
})
