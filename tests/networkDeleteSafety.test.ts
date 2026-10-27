import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedIpRange, seedNetwork, seedSite, seedSwitch } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { apiTokenRepository } from '../server/repositories/apiTokenRepository'
import { networkImpactToken, networkRepository } from '../server/repositories/networkRepository'

const bearer = (t: string) => ({ authorization: `Bearer ${t}` })

describe('safe network delete (preview + impactToken + atomic execution)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteId: string
  let networkId: string
  let allocationId: string
  let portId: string

  const seedImpact = async () => {
    const net = await seedNetwork(prisma, { site_id: siteId, slug: 'mgmt', name: 'Mgmt', subnet: '10.0.9.0/24' })
    networkId = net.id
    allocationId = randomUUID()
    await prisma.ipAllocation.create({
      data: {
        id: allocationId,
        network_id: net.id,
        ip_address: '10.0.9.10',
        hostname: 'host-a',
        status: 'assigned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })
    await seedIpRange(prisma, { network_id: net.id, start_ip: '10.0.9.100', end_ip: '10.0.9.120', type: 'dhcp' })
    const sw = await seedSwitch(prisma, { site_id: siteId, slug: `sw-${randomUUID().slice(0, 6)}` })
    portId = randomUUID()
    await prisma.port.create({
      data: {
        id: portId,
        switch_id: sw.id,
        unit: 1,
        index: 1,
        type: 'rj45',
        status: 'connected',
        connected_allocation_id: allocationId
      }
    })
  }

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
    await seedImpact()
  })

  it('previews the removed allocations/ranges and the port links it clears', async () => {
    const impact = await networkRepository.getDeleteImpact(networkId)
    expect(impact?.network).toMatchObject({ id: networkId, name: 'Mgmt', subnet: '10.0.9.0/24' })
    expect(impact?.allocations).toEqual([{ id: allocationId, ip_address: '10.0.9.10', hostname: 'host-a' }])
    expect(impact?.ranges).toHaveLength(1)
    expect(impact?.ports).toEqual([expect.objectContaining({ id: portId, connected_allocation_id: allocationId })])
    expect(networkImpactToken(impact!)).toBe(networkImpactToken((await networkRepository.getDeleteImpact(networkId))!))
  })

  it('returns a conflict with fresh impact when the state changed after the preview (no mutation)', async () => {
    const preview = (await networkRepository.getDeleteImpact(networkId))!
    const staleToken = networkImpactToken(preview)

    await prisma.ipAllocation.create({
      data: {
        id: randomUUID(),
        network_id: networkId,
        ip_address: '10.0.9.11',
        status: 'assigned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    const outcome = await networkRepository.deleteGuarded(networkId, undefined, staleToken)
    expect(outcome.kind).toBe('conflict')
    if (outcome.kind === 'conflict') {
      expect(outcome.impact.allocations).toHaveLength(2)
      expect(outcome.impactToken).not.toBe(staleToken)
    }
    expect(await prisma.network.count({ where: { id: networkId } })).toBe(1)
    expect(await prisma.ipAllocation.count({ where: { network_id: networkId } })).toBe(2)
    expect(await prisma.ipRange.count({ where: { network_id: networkId } })).toBe(1)
  })

  it('deletes network, allocations and ranges atomically and clears the port link', async () => {
    const token = networkImpactToken((await networkRepository.getDeleteImpact(networkId))!)
    const outcome = await networkRepository.deleteGuarded(networkId, undefined, token)

    expect(outcome.kind).toBe('deleted')
    expect(await prisma.network.count({ where: { id: networkId } })).toBe(0)
    expect(await prisma.ipAllocation.count({ where: { network_id: networkId } })).toBe(0)
    expect(await prisma.ipRange.count({ where: { network_id: networkId } })).toBe(0)
    expect((await prisma.port.findUnique({ where: { id: portId } }))?.connected_allocation_id).toBeNull()
  })

  it('keeps the legacy no-precondition path (JWT/UI) working', async () => {
    const outcome = await networkRepository.deleteGuarded(networkId)
    expect(outcome.kind).toBe('deleted')
    expect(await prisma.network.count({ where: { id: networkId } })).toBe(0)
  })

  it('rolls back the child deletes when the network delete fails', async () => {
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER block_network_delete BEFORE DELETE ON "Network" BEGIN SELECT RAISE(ABORT, 'blocked'); END;`
    )
    const token = networkImpactToken((await networkRepository.getDeleteImpact(networkId))!)
    try {
      // valid expectedImpactToken: the precondition passes, so the abort happens after the child deletes
      await expect(networkRepository.deleteGuarded(networkId, undefined, token)).rejects.toThrow()
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS block_network_delete;')
    }
    expect(await prisma.network.count({ where: { id: networkId } })).toBe(1)
    expect(await prisma.ipAllocation.count({ where: { network_id: networkId } })).toBe(1)
    expect(await prisma.ipRange.count({ where: { network_id: networkId } })).toBe(1)
  })

  describe('DELETE /api/networks/[id]', () => {
    const mintToken = async (username: string) => {
      const admin = await seedLocalUser(prisma, { username, role: 'admin' })
      const created = await apiTokenRepository.create(admin.id, { name: 'mcp' })
      if (!created.ok) throw new Error(created.reason)
      return created.token.token
    }

    it('previews for API tokens, then deletes with the returned impactToken', async () => {
      const token = await mintToken('boss')

      const preview = await dispatch({ method: 'DELETE', path: `/api/networks/${networkId}`, headers: bearer(token) })
      expect(preview.status).toBe(200)
      const body = preview.body as { preview: boolean, impactToken: string, impact: { allocations: unknown[] } }
      expect(body.preview).toBe(true)
      expect(body.impact.allocations).toHaveLength(1)

      const stale = await dispatch({
        method: 'DELETE',
        path: `/api/networks/${networkId}?confirm=true&expectedImpactToken=deadbeef`,
        headers: bearer(token)
      })
      expect(stale.status).toBe(409)
      expect((stale.error?.data as { impactToken?: string }).impactToken).toBeTruthy()
      expect(await prisma.network.count({ where: { id: networkId } })).toBe(1)

      const done = await dispatch({
        method: 'DELETE',
        path: `/api/networks/${networkId}?confirm=true&expectedImpactToken=${body.impactToken}`,
        headers: bearer(token)
      })
      expect(done.status).toBe(204)
      expect(await prisma.network.count({ where: { id: networkId } })).toBe(0)
    })

    it('rejects API-token confirm without expectedImpactToken (400, no mutation)', async () => {
      const token = await mintToken('boss2')
      const res = await dispatch({ method: 'DELETE', path: `/api/networks/${networkId}?confirm=true`, headers: bearer(token) })
      expect(res.status).toBe(400)
      expect(await prisma.network.count({ where: { id: networkId } })).toBe(1)
    })

    it('keeps the JWT/UI delete compatible (no confirm or token required)', async () => {
      const admin = await seedLocalUser(prisma, { username: 'ui-admin', role: 'admin' })
      const res = await dispatch({ method: 'DELETE', path: `/api/networks/${networkId}`, cookies: asCookie(tokenFor(admin)) })
      expect(res.status).toBe(204)
      expect(await prisma.network.count({ where: { id: networkId } })).toBe(0)
    })
  })
})
