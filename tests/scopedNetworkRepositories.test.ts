import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { networkRepository, hasConflictToken  } from '../server/repositories/networkRepository'
import { ipAllocationRepository } from '../server/repositories/ipAllocationRepository'
import { vlanRepository } from '../server/repositories/vlanRepository'
import { switchRepository } from '../server/repositories/switchRepository'
import { activityRepository } from '../server/repositories/activityRepository'
import undoHandler from '../server/api/activity/[id]/undo.post'
import vlanDeleteHandler from '../server/api/vlans/[id].delete'
import dashboardStats from '../server/api/dashboard/stats.get'

describe('scoped network uniqueness (repositories/API)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let s1: string
  let s2: string

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
    s1 = (await seedSite(prisma)).id
    s2 = (await seedSite(prisma)).id
  })

  // Temporarily drop a write-guard trigger to build legacy-dirty data; always restored.
  const withoutTrigger = async (name: string, fn: () => Promise<void>) => {
    const [row] = await prisma.$queryRawUnsafe<Array<{ sql: string }>>(`SELECT sql FROM sqlite_master WHERE type='trigger' AND name='${name}'`)
    await prisma.$executeRawUnsafe(`DROP TRIGGER "${name}"`)
    try {
      await fn()
    } finally {
      await prisma.$executeRawUnsafe(row!.sql)
    }
  }

  const mkVlan = (siteId: string, tag: number) => vlanRepository.create({
    site_id: siteId, vlan_id: tag, name: `v${tag}`, status: 'active', color: `c${randomUUID()}`
  } as never)
  const mkNet = (siteId: string, subnet: string, vlan_id?: string, name = `n-${randomUUID().slice(0, 6)}`) =>
    networkRepository.create({ site_id: siteId, name, subnet, vlan_id, dns_servers: [] } as never)

  describe('networks', () => {
    it('allows identical CIDR across VLAN/untagged/site and the same host IP in each', async () => {
      const v = await mkVlan(s1, 10)
      const a = await mkNet(s1, '10.18.111.0/24')
      const b = await mkNet(s1, '10.18.111.0/24', v.id)
      const c = await mkNet(s2, '10.18.111.0/24')
      for (const n of [a, b, c]) {
        const alloc = await ipAllocationRepository.create(n.id, { ip_address: '10.18.111.1', status: 'active' })
        expect(alloc.network_id).toBe(n.id)
      }
    })

    it('rejects canonical-identical CIDR in same site+scope (incl. untagged) with 409 and name', async () => {
      await mkNet(s1, '10.0.0.0/24', undefined, 'First')
      await expect(mkNet(s1, '10.0.0.77/24')).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('First') })
      const v = await mkVlan(s1, 20)
      await mkNet(s1, '10.0.0.0/24', v.id)
      await expect(mkNet(s1, '10.0.0.0/24', v.id)).rejects.toMatchObject({ statusCode: 409 })
    })

    it('allows different overlapping CIDRs', async () => {
      await mkNet(s1, '10.0.0.0/24')
      await expect(mkNet(s1, '10.0.0.0/25')).resolves.toBeTruthy()
    })

    it('stores canonical subnet on create and update; update checks scope/key changes only', async () => {
      const a = await mkNet(s1, '10.1.0.9/24')
      expect(a.subnet).toBe('10.1.0.0/24')
      const b = await mkNet(s1, '10.2.0.0/24')
      await expect(networkRepository.update(b.id, { subnet: '10.1.0.200/24' })).rejects.toMatchObject({ statusCode: 409 })
      const v = await mkVlan(s1, 30)
      await expect(networkRepository.update(b.id, { vlan_id: v.id })).resolves.toBeTruthy()
      // self resubmit (dirty-looking) is fine
      await expect(networkRepository.update(b.id, { subnet: '10.2.0.5/24', name: 'renamed' })).resolves.toMatchObject({ subnet: '10.2.0.0/24' })
      // moving b back to untagged with a's CIDR would collide
      await networkRepository.update(b.id, { subnet: '10.1.0.0/24' })
      await expect(networkRepository.update(b.id, { vlan_id: null as never })).rejects.toMatchObject({ statusCode: 409 })
    })

    it('metadata updates on legacy duplicates still work', async () => {
      const a = await mkNet(s1, '10.3.0.0/24')
      const b = await mkNet(s1, '10.4.0.0/24')
      await withoutTrigger('Network_scoped_subnet_conflict_update', async () => {
        await prisma.network.update({ where: { id: b.id }, data: { subnet: '10.3.0.0/24' } })
      })
      await expect(networkRepository.update(b.id, { description: 'x', is_favorite: true })).resolves.toBeTruthy()
      expect(a.id).not.toBe(b.id)
    })
  })

  describe('allocations', () => {
    it('rejects duplicate IP within network and on move into collision; allows other-network same IP', async () => {
      const a = await mkNet(s1, '10.5.0.0/24')
      const b = await mkNet(s1, '10.5.0.0/25', (await mkVlan(s1, 40)).id)
      await ipAllocationRepository.create(a.id, { ip_address: '10.5.0.10', status: 'active' })
      await expect(ipAllocationRepository.create(a.id, { ip_address: '10.5.0.10', status: 'active' })).rejects.toMatchObject({ statusCode: 409 })
      const other = await ipAllocationRepository.create(b.id, { ip_address: '10.5.0.20', status: 'active' })
      await expect(ipAllocationRepository.update(other.id, { network_id: a.id, ip_address: '10.5.0.10' })).rejects.toMatchObject({ statusCode: 409 })
      await expect(ipAllocationRepository.update(other.id, { ip_address: '10.5.0.10' })).resolves.toBeTruthy()
    })
  })

  describe('VLAN delete', () => {
    const ev = (id: string) => ({ context: { params: { id }, auth: { userId: '' } } })

    it('409s without partial untagging when it would duplicate an untagged CIDR; normal delete works; unknown 404', async () => {
      const v = await mkVlan(s1, 50)
      const tagged = await mkNet(s1, '10.6.0.0/24', v.id)
      const other = await mkNet(s1, '10.7.0.0/24', v.id)
      await mkNet(s1, '10.6.0.0/24')
      await expect((vlanDeleteHandler as (e: unknown) => Promise<unknown>)(ev(v.id))).rejects.toMatchObject({ statusCode: 409, data: { code: 'VLAN_NETWORK_SUBNET_CONFLICT' } })
      expect((await prisma.network.findUniqueOrThrow({ where: { id: tagged.id } })).vlan_id).toBe(v.id)
      expect((await prisma.network.findUniqueOrThrow({ where: { id: other.id } })).vlan_id).toBe(v.id)
      expect(await prisma.vlan.findUnique({ where: { id: v.id } })).toBeTruthy()

      const v2 = await mkVlan(s1, 51)
      await mkNet(s1, '10.8.0.0/24', v2.id)
      await expect((vlanDeleteHandler as (e: unknown) => Promise<unknown>)(ev(v2.id))).resolves.toBeNull()
      await expect((vlanDeleteHandler as (e: unknown) => Promise<unknown>)(ev(v2.id))).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('VLAN delete across sites', () => {
    it('own networks in several sites: only same-site untagged collisions block', async () => {
      const v = await mkVlan(s1, 80)
      await mkNet(s1, '10.12.0.0/24', v.id)
      const foreign = await mkNet(s2, '10.12.0.0/24', v.id) // API allows a VLAN on another site's network
      await mkNet(s1, '10.13.0.0/24') // different CIDR, no clash
      await mkNet(s2, '10.12.0.9/24') // untagged in s2, canonical-equal to `foreign`
      await expect(vlanRepository.delete(v.id)).rejects.toMatchObject({
        statusCode: 409, data: { code: 'VLAN_NETWORK_SUBNET_CONFLICT', conflicts: [{ id: foreign.id }] }
      })
      await prisma.network.deleteMany({ where: { site_id: s2, vlan_id: null } })
      await expect(vlanRepository.delete(v.id)).resolves.toBe(true)
      expect((await prisma.network.findUniqueOrThrow({ where: { id: foreign.id } })).vlan_id).toBeNull()
    })
  })

  describe('trigger error evidence', () => {
    it('real trigger errors (bypassing prechecks) are recognised for 409 mapping', async () => {
      const n = await mkNet(s1, '10.14.0.0/24')
      const now = new Date().toISOString()
      const netErr = await prisma.network.create({
        data: { id: randomUUID(), site_id: s1, slug: 'dup', name: 'dup', subnet: '10.14.0.0/24', dns_servers: '[]', is_favorite: false, created_at: now, updated_at: now }
      }).catch(e => e)
      expect(hasConflictToken(netErr, 'NETWORK_SUBNET_CONFLICT')).toBe(true)
      expect(hasConflictToken(netErr, 'IP_ALLOCATION_CONFLICT')).toBe(false)
      await ipAllocationRepository.create(n.id, { ip_address: '10.14.0.5', status: 'active' })
      const ipErr = await prisma.ipAllocation.create({
        data: { id: randomUUID(), network_id: n.id, ip_address: '10.14.0.5', status: 'active', created_at: now, updated_at: now }
      }).catch(e => e)
      expect(hasConflictToken(ipErr, 'IP_ALLOCATION_CONFLICT')).toBe(true)
    })
  })

  describe('undo recreate', () => {
    const ev = (id: string) => ({ context: { params: { id }, auth: { userId: '' } } })
    it('409s when recreating a network/allocation that now collides', async () => {
      const n = await mkNet(s1, '10.9.0.0/24')
      const nid = randomUUID()
      const log = await activityRepository.log({
        user_id: '', action: 'delete', entity_type: 'network', entity_id: nid, entity_name: 'x',
        previous_state: { id: nid, site_id: s1, slug: 'old', name: 'old', vlan_id: null, subnet: '10.9.0.0/24', dns_servers: [], is_favorite: false, created_at: new Date().toISOString() }
      } as never)
      await expect((undoHandler as (e: unknown) => Promise<unknown>)(ev(log.id))).rejects.toMatchObject({ statusCode: 409 })

      const a = await ipAllocationRepository.create(n.id, { ip_address: '10.9.0.5', status: 'active' })
      const log2 = await activityRepository.log({
        user_id: '', action: 'delete', entity_type: 'ip_allocation', entity_id: randomUUID(), entity_name: 'x',
        previous_state: { id: randomUUID(), network_id: n.id, ip_address: '10.9.0.5', status: 'active', created_at: new Date().toISOString() }
      } as never)
      await expect((undoHandler as (e: unknown) => Promise<unknown>)(ev(log2.id))).rejects.toMatchObject({ statusCode: 409 })
      expect(a.id).toBeTruthy()
    })
  })

  describe('undo network canonical recreate', () => {
    it('recreates a valid non-canonical snapshot with the canonical subnet', async () => {
      const nid = randomUUID()
      const log = await activityRepository.log({
        user_id: '', action: 'delete', entity_type: 'network', entity_id: nid, entity_name: 'x',
        previous_state: { id: nid, site_id: s1, slug: 'old', name: 'old', vlan_id: null, subnet: '10.15.0.77/24', dns_servers: [], is_favorite: false, created_at: new Date().toISOString() }
      } as never)
      await (undoHandler as (e: unknown) => Promise<unknown>)({ context: { params: { id: log.id }, auth: { userId: '' } } })
      expect((await prisma.network.findUniqueOrThrow({ where: { id: nid } })).subnet).toBe('10.15.0.0/24')
    })
  })

  describe('management IP sync (site move / old cleanup)', () => {
    const marker = (name: string) => `Management IP for switch: ${name}`
    const count = (network_id: string, ip: string) => prisma.ipAllocation.count({ where: { network_id, ip_address: ip } })

    it('site move with same IP and name, and renamed move, resync to the new site', async () => {
      const n1 = await mkNet(s1, '10.20.0.0/24')
      const n2 = await mkNet(s2, '10.20.0.0/24')
      const sw = await switchRepository.create({ site_id: s1, name: 'mv', management_ip: '10.20.0.5', tags: [], configured_vlans: [] } as never)
      expect(await count(n1.id, '10.20.0.5')).toBe(1)
      await switchRepository.update(sw.id, { site_id: s2 })
      expect(await count(n1.id, '10.20.0.5')).toBe(0)
      expect(await count(n2.id, '10.20.0.5')).toBe(1)
      await switchRepository.update(sw.id, { site_id: s1, name: 'mv2' })
      expect(await count(n2.id, '10.20.0.5')).toBe(0)
      expect(await prisma.ipAllocation.findFirst({ where: { network_id: n1.id, ip_address: '10.20.0.5' } })).toMatchObject({ description: marker('mv2') })
    })

    it('old IP change/delete removes only the exact owner marker in the old site, even with overlapping networks', async () => {
      const n1 = await mkNet(s1, '10.21.0.0/24')
      const n1b = await mkNet(s1, '10.21.0.0/24', (await mkVlan(s1, 90)).id) // overlap: old target is ambiguous
      const n2 = await mkNet(s2, '10.21.0.0/24')
      const sw = await switchRepository.create({ site_id: s1, name: 'own', management_ip: '10.21.0.5', tags: [], configured_vlans: [] } as never)
      expect(await count(n1.id, '10.21.0.5') + await count(n1b.id, '10.21.0.5')).toBe(0) // ambiguous => skipped
      const seed = (network_id: string, description: string) => ipAllocationRepository.create(network_id, { ip_address: '10.21.0.5', status: 'active', description })
      await seed(n1.id, marker('own'))
      await seed(n1b.id, marker('someone-else'))
      await seed(n2.id, marker('own')) // other site

      await switchRepository.update(sw.id, { management_ip: '10.21.0.99' })
      expect(await count(n1.id, '10.21.0.5')).toBe(0)
      expect(await count(n1b.id, '10.21.0.5')).toBe(1)
      expect(await count(n2.id, '10.21.0.5')).toBe(1)

      await seed(n1.id, marker('own'))
      await prisma.switch.update({ where: { id: sw.id }, data: { management_ip: '10.21.0.5' } })
      expect(await switchRepository.delete(sw.id)).toBe(true)
      expect(await count(n1.id, '10.21.0.5')).toBe(0)
      expect(await count(n1b.id, '10.21.0.5')).toBe(1)
      expect(await count(n2.id, '10.21.0.5')).toBe(1)
    })
  })

  describe('management IP sync', () => {
    it('uses only the switch-site network; skips ambiguous; cleanup keeps other owners', async () => {
      const n1 = await mkNet(s1, '10.10.0.0/24')
      const n2 = await mkNet(s2, '10.10.0.0/24')
      const sw = await switchRepository.create({ site_id: s1, name: 'sw1', management_ip: '10.10.0.5', tags: [], configured_vlans: [] } as never)
      expect(await prisma.ipAllocation.count({ where: { network_id: n1.id, ip_address: '10.10.0.5' } })).toBe(1)
      expect(await prisma.ipAllocation.count({ where: { network_id: n2.id } })).toBe(0)

      // other-owner allocation of old IP in other site/network survives cleanup
      await ipAllocationRepository.create(n2.id, { ip_address: '10.10.0.5', status: 'active', description: 'Management IP for switch: sw1' })
      await switchRepository.update(sw.id, { management_ip: '10.10.0.6' })
      expect(await prisma.ipAllocation.count({ where: { network_id: n1.id, ip_address: '10.10.0.5' } })).toBe(0)
      expect(await prisma.ipAllocation.count({ where: { network_id: n2.id, ip_address: '10.10.0.5' } })).toBe(1)
      expect(await prisma.ipAllocation.count({ where: { network_id: n1.id, ip_address: '10.10.0.6' } })).toBe(1)

      // ambiguous (two networks in site contain the IP) => skipped, nothing created
      const v = await mkVlan(s1, 60)
      await mkNet(s1, '10.10.0.0/24', v.id)
      await switchRepository.update(sw.id, { management_ip: '10.10.0.7' })
      expect(await prisma.ipAllocation.count({ where: { ip_address: '10.10.0.7' } })).toBe(0)
    })
  })

  describe('dashboard duplicates', () => {
    it('flags only same-network repeats', async () => {
      const a = await mkNet(s1, '10.11.0.0/24')
      const b = await mkNet(s1, '10.11.0.0/25', (await mkVlan(s1, 70)).id)
      await ipAllocationRepository.create(a.id, { ip_address: '10.11.0.9', status: 'active' })
      await ipAllocationRepository.create(b.id, { ip_address: '10.11.0.9', status: 'active' })
      let stats = await dashboardStats({ query: { site_id: s1 } } as never) as { duplicateIps: string[] }
      expect(stats.duplicateIps).toEqual([])

      const now = new Date().toISOString()
      await withoutTrigger('IpAllocation_unique_ip_insert', async () => {
        await prisma.ipAllocation.create({ data: { id: randomUUID(), network_id: a.id, ip_address: '10.11.0.9', status: 'active', created_at: now, updated_at: now } })
      })
      stats = await dashboardStats({ query: { site_id: s1 } } as never) as { duplicateIps: string[] }
      expect(stats.duplicateIps).toEqual(['10.11.0.9'])
    })
  })
})
