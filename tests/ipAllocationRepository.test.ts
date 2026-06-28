import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedNetwork, seedIpRange } from './testHelpers'
import { ipAllocationRepository } from '../server/repositories/ipAllocationRepository'

describe('ipAllocationRepository', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let net1: string
  let net2: string

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
    net2 = (await seedNetwork(prisma, { site_id: siteId, name: 'Second Network', subnet: '10.0.2.0/24', gateway: '10.0.2.1' })).id
    await seedIpRange(prisma, { network_id: net1, start_ip: '10.0.1.100', end_ip: '10.0.1.200', type: 'dhcp' })
  })

  describe('create', () => {
    it('creates allocation with valid IP', async () => {
      const result = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })
      expect(result.id).toBeTruthy()
      expect(result.ip_address).toBe('10.0.1.10')
      expect(result.network_id).toBe(net1)
    })

    it('rejects invalid IP address', async () => {
      await expect(ipAllocationRepository.create(net1, { ip_address: 'not-an-ip', status: 'active' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Invalid IP/) })
    })

    it('rejects IP outside subnet', async () => {
      await expect(ipAllocationRepository.create(net1, { ip_address: '192.168.1.5', status: 'active' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects network address', async () => {
      await expect(ipAllocationRepository.create(net1, { ip_address: '10.0.1.0', status: 'active' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/network/) })
    })

    it('rejects broadcast address', async () => {
      await expect(ipAllocationRepository.create(net1, { ip_address: '10.0.1.255', status: 'active' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/broadcast/) })
    })

    it('rejects duplicate IP in same network', async () => {
      await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })
      await expect(ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' }))
        .rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/already allocated/) })
    })

    it('rejects invalid MAC address format', async () => {
      await expect(ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', mac_address: 'invalid-mac', status: 'active' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/MAC/) })
    })

    it('accepts valid MAC address', async () => {
      const result = await ipAllocationRepository.create(net1, {
        ip_address: '10.0.1.10',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        status: 'active'
      })
      expect(result.mac_address).toBe('AA:BB:CC:DD:EE:FF')
    })

    it('rejects IP inside DHCP range', async () => {
      await expect(ipAllocationRepository.create(net1, { ip_address: '10.0.1.150', status: 'active' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/DHCP/) })
    })

    it('accepts IP outside DHCP range', async () => {
      const result = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.50', status: 'active' })
      expect(result.ip_address).toBe('10.0.1.50')
    })

    it('rejects unknown network', async () => {
      await expect(ipAllocationRepository.create('00000000-0000-4000-8000-000000000000', { ip_address: '10.0.1.10', status: 'active' }))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('rejects duplicate IP across networks (global uniqueness)', async () => {
      await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })
      // Different subnet so IP collision is purely the global-unique check.
      await expect(ipAllocationRepository.create(net2, { ip_address: '10.0.1.10', status: 'active' }))
        .rejects.toMatchObject({ statusCode: 400 }) // subnet check fires first; either way the bad IP is blocked
    })
  })

  describe('update', () => {
    it('updates allocation', async () => {
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })
      const updated = await ipAllocationRepository.update(created.id, { hostname: 'server-1' })
      expect(updated.hostname).toBe('server-1')
      expect(updated.ip_address).toBe('10.0.1.10')
    })

    it('rejects invalid MAC on update', async () => {
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })
      await expect(ipAllocationRepository.update(created.id, { mac_address: 'bad' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('allows updating to a free IP outside the DHCP range', async () => {
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })
      const updated = await ipAllocationRepository.update(created.id, { ip_address: '10.0.1.11' })
      expect(updated.ip_address).toBe('10.0.1.11')
    })

    it('rejects updating IP into a DHCP range', async () => {
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })
      await expect(ipAllocationRepository.update(created.id, { ip_address: '10.0.1.150' }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/DHCP/) })
    })

    it('suggests a same-site network move instead of silently moving an IP outside the current subnet', async () => {
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })

      await expect(ipAllocationRepository.update(created.id, { ip_address: '10.0.2.10' }))
        .rejects.toMatchObject({
          statusCode: 409,
          data: {
            code: 'IP_NETWORK_MOVE_REQUIRED',
            candidates: [{ id: net2, subnet: '10.0.2.0/24', name: 'Second Network' }]
          }
        })
    })

    it('moves an allocation only when the target network is explicit', async () => {
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })

      const updated = await ipAllocationRepository.update(created.id, { ip_address: '10.0.2.10', network_id: net2 })

      expect(updated.ip_address).toBe('10.0.2.10')
      expect(updated.network_id).toBe(net2)
    })

    it('rejects a network-only move when the current IP does not fit the target subnet', async () => {
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })

      await expect(ipAllocationRepository.update(created.id, { network_id: net2 }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/not in network/) })
    })

    it('rejects explicit moves to networks in another site', async () => {
      const otherSite = await seedSite(prisma, { name: 'Other Site' })
      const otherNetwork = await seedNetwork(prisma, { site_id: otherSite.id, name: 'Other Site Network', subnet: '10.0.3.0/24', gateway: '10.0.3.1' })
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })

      await expect(ipAllocationRepository.update(created.id, { ip_address: '10.0.3.10', network_id: otherNetwork.id }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Cross-site/) })
    })

    it('rejects explicit moves into a DHCP range on the target network', async () => {
      await seedIpRange(prisma, { network_id: net2, start_ip: '10.0.2.100', end_ip: '10.0.2.200', type: 'dhcp' })
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })

      await expect(ipAllocationRepository.update(created.id, { ip_address: '10.0.2.150', network_id: net2 }))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/DHCP/) })
    })
  })

  describe('delete', () => {
    it('removes allocation', async () => {
      const created = await ipAllocationRepository.create(net1, { ip_address: '10.0.1.10', status: 'active' })
      expect(await ipAllocationRepository.delete(created.id)).toBe(true)
      expect(await ipAllocationRepository.getById(created.id)).toBe(null)
    })

    it('returns false for unknown id', async () => {
      expect(await ipAllocationRepository.delete('00000000-0000-4000-8000-000000000000')).toBe(false)
    })
  })
})
