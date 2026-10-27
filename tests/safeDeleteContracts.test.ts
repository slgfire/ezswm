import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedIpRange, seedNetwork, seedSite, seedSwitch } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { apiTokenRepository } from '../server/repositories/apiTokenRepository'
import { ipAllocationImpactToken, ipAllocationRepository } from '../server/repositories/ipAllocationRepository'
import { ipRangeImpactToken, ipRangeRepository } from '../server/repositories/ipRangeRepository'
import { vlanImpactToken, vlanRepository } from '../server/repositories/vlanRepository'
import { lagGroupImpactToken, lagGroupRepository } from '../server/repositories/lagGroupRepository'

const bearer = (t: string) => ({ authorization: `Bearer ${t}` })
const now = () => new Date().toISOString()

const seedVlan = async (prisma: PrismaClient, v: { site_id: string, vlan_id: number, name: string }) => prisma.vlan.create({
  data: {
    id: randomUUID(),
    site_id: v.site_id,
    vlan_id: v.vlan_id,
    name: v.name,
    status: 'active',
    color: '#00bb50',
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
})

describe('safe delete contracts (allocation, range, VLAN, LAG)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteId: string
  let networkId: string
  let allocationId: string
  let portId: string

  beforeAll(async () => {
    installH3Globals()
    const ctx = await createTestPrisma()
    prisma = ctx.prisma
    resetDb = ctx.resetDb
    cleanup = ctx.cleanup
    globalThis.__prismaTestClient = prisma
  })
  afterAll(async () => {
    resetOidcRuntime()
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })
  beforeEach(async () => {
    await resetDb()
    setOidcRuntime({})
    siteId = (await seedSite(prisma, { slug: 'hq' })).id
    networkId = (await seedNetwork(prisma, { site_id: siteId, slug: 'mgmt', name: 'Mgmt', subnet: '10.0.7.0/24' })).id
    allocationId = randomUUID()
    await prisma.ipAllocation.create({
      data: { id: allocationId, network_id: networkId, ip_address: '10.0.7.10', hostname: 'h', status: 'assigned', created_at: now(), updated_at: now() }
    })
    const sw = await seedSwitch(prisma, { site_id: siteId, slug: `sw-${randomUUID().slice(0, 6)}` })
    portId = randomUUID()
    await prisma.port.create({
      data: { id: portId, switch_id: sw.id, unit: 1, index: 1, type: 'rj45', status: 'connected', connected_allocation_id: allocationId }
    })
  })

  describe('IP allocation', () => {
    it('previews the linked port, conflicts on stale state, then deletes atomically (peer links untouched)', async () => {
      const preview = (await ipAllocationRepository.getDeleteImpact(allocationId))!
      expect(preview.ports).toHaveLength(1)
      const token = ipAllocationImpactToken(preview)

      const peerId = randomUUID()
      await prisma.port.create({
        data: { id: peerId, switch_id: (await prisma.port.findUniqueOrThrow({ where: { id: portId } })).switch_id, unit: 1, index: 2, type: 'rj45', status: 'connected' }
      })
      const portRow = await prisma.port.findUniqueOrThrow({ where: { id: portId } })
      await prisma.port.update({ where: { id: portId }, data: { connected_port_id: peerId, connected_device_id: portRow.switch_id } })
      await prisma.port.update({ where: { id: peerId }, data: { connected_port_id: portId, connected_device_id: portRow.switch_id } })

      await prisma.ipAllocation.update({ where: { id: allocationId }, data: { hostname: 'renamed' } })
      const stale = await ipAllocationRepository.deleteGuarded(allocationId, token)
      expect(stale.kind).toBe('conflict')
      expect((await prisma.ipAllocation.findUnique({ where: { id: allocationId } }))?.hostname).toBe('renamed')

      const fresh = ipAllocationImpactToken((await ipAllocationRepository.getDeleteImpact(allocationId))!)
      expect((await ipAllocationRepository.deleteGuarded(allocationId, fresh)).kind).toBe('deleted')
      const port = await prisma.port.findUniqueOrThrow({ where: { id: portId } })
      expect(port.connected_allocation_id).toBeNull()
      expect(port.connected_port_id).toBe(peerId)
      expect((await prisma.port.findUniqueOrThrow({ where: { id: peerId } })).connected_port_id).toBe(portId)
    })
  })

  describe('IP range', () => {
    it('previews, rejects a stale token after a field change, and deletes the row', async () => {
      const range = await seedIpRange(prisma, { network_id: networkId, start_ip: '10.0.7.100', end_ip: '10.0.7.110' })
      const token = ipRangeImpactToken((await ipRangeRepository.getDeleteImpact(range.id))!)
      await prisma.ipRange.update({ where: { id: range.id }, data: { type: 'reserved' } })
      expect((await ipRangeRepository.deleteGuarded(range.id, token)).kind).toBe('conflict')
      const fresh = ipRangeImpactToken((await ipRangeRepository.getDeleteImpact(range.id))!)
      expect((await ipRangeRepository.deleteGuarded(range.id, fresh)).kind).toBe('deleted')
      expect(await prisma.ipRange.count({ where: { id: range.id } })).toBe(0)
    })
  })

  describe('VLAN', () => {
    it('reports the untagged-scope CIDR conflict in the preview and blocks without mutating', async () => {
      const vlan = await seedVlan(prisma, { site_id: siteId, vlan_id: 42, name: 'VLAN 42' })
      await seedNetwork(prisma, { site_id: siteId, slug: 'tagged', name: 'Tagged', subnet: '10.0.8.0/24', vlan_id: vlan.id })
      await seedNetwork(prisma, { site_id: siteId, slug: 'untagged', name: 'Untagged', subnet: '10.0.8.0/24' })

      const impact = (await vlanRepository.getDeleteImpact(vlan.id))!
      expect(impact.conflicts).toHaveLength(1)
      expect(impact.networks).toHaveLength(1)
      await expect(vlanRepository.deleteGuarded(vlan.id, vlanImpactToken(impact))).rejects.toThrow(/duplicate/)
      expect(await prisma.vlan.count({ where: { id: vlan.id } })).toBe(1)
    })

    it('deletes when unblocked and untags its networks', async () => {
      const vlan = await seedVlan(prisma, { site_id: siteId, vlan_id: 43, name: 'VLAN 43' })
      const net = await seedNetwork(prisma, { site_id: siteId, slug: 'tagged', name: 'Tagged', subnet: '10.0.9.0/24', vlan_id: vlan.id })
      const impact = (await vlanRepository.getDeleteImpact(vlan.id))!
      expect(impact.conflicts).toHaveLength(0)
      expect((await vlanRepository.deleteGuarded(vlan.id, vlanImpactToken(impact))).kind).toBe('deleted')
      expect(await prisma.vlan.count({ where: { id: vlan.id } })).toBe(0)
      expect((await prisma.network.findUniqueOrThrow({ where: { id: net.id } })).vlan_id).toBeNull()
    })
  })

  describe('LAG group', () => {
    it('fingerprints the options and deletes under the matching token', async () => {
      const sw = await seedSwitch(prisma, { site_id: siteId, slug: 'lag-sw' })
      const lag = await prisma.lagGroup.create({
        data: { id: randomUUID(), switch_id: sw.id, name: 'LAG1', created_at: now(), updated_at: now() }
      })
      const memberId = randomUUID()
      await prisma.port.create({ data: { id: memberId, switch_id: sw.id, unit: 1, index: 10, type: 'sfp', status: 'up', lag_group_id: lag.id } })

      const impact = (await lagGroupRepository.getDeleteImpact(lag.id, { reset_ports: true }))!
      expect(impact.members).toHaveLength(1)
      expect(impact.options).toEqual({ delete_remote: false, reset_ports: true })

      const mismatch = await lagGroupRepository.deleteGuarded(lag.id, { reset_ports: false }, lagGroupImpactToken(impact))
      expect(mismatch.kind).toBe('conflict')

      const fresh = lagGroupImpactToken((await lagGroupRepository.getDeleteImpact(lag.id, { reset_ports: true }))!)
      expect((await lagGroupRepository.deleteGuarded(lag.id, { reset_ports: true }, fresh)).kind).toBe('deleted')
      expect(await prisma.lagGroup.count({ where: { id: lag.id } })).toBe(0)
      expect((await prisma.port.findUniqueOrThrow({ where: { id: memberId } })).lag_group_id).toBeNull()
    })
  })

  describe('DELETE /api/networks/[id]/allocations/[allocId] (API token + JWT)', () => {
    const admin = async (username: string) => seedLocalUser(prisma, { username, role: 'admin' })

    it('previews, requires the token, rejects a stale token, then deletes', async () => {
      const u = await admin('boss')
      const created = await apiTokenRepository.create(u.id, { name: 'mcp' })
      if (!created.ok) throw new Error(created.reason)
      const path = `/api/networks/${networkId}/allocations/${allocationId}`

      const preview = await dispatch({ method: 'DELETE', path, headers: bearer(created.token.token) })
      expect(preview.status).toBe(200)
      const body = preview.body as { impactToken: string }

      expect((await dispatch({ method: 'DELETE', path: `${path}?confirm=true`, headers: bearer(created.token.token) })).status).toBe(400)
      expect((await dispatch({ method: 'DELETE', path: `${path}?confirm=true&expectedImpactToken=nope`, headers: bearer(created.token.token) })).status).toBe(409)
      expect(await prisma.ipAllocation.count({ where: { id: allocationId } })).toBe(1)

      const done = await dispatch({ method: 'DELETE', path: `${path}?confirm=true&expectedImpactToken=${body.impactToken}`, headers: bearer(created.token.token) })
      expect(done.status).toBe(204)
      expect(await prisma.ipAllocation.count({ where: { id: allocationId } })).toBe(0)
    })

    it('keeps the JWT/UI path working without a precondition', async () => {
      const u = await admin('ui-admin')
      const res = await dispatch({ method: 'DELETE', path: `/api/networks/${networkId}/allocations/${allocationId}`, cookies: asCookie(tokenFor(u)) })
      expect(res.status).toBe(204)
    })
  })
})
