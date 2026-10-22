import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedIpRange, seedNetwork, seedSite } from './testHelpers'
import { asCookie, dispatch, installH3Globals, seedLocalUser, tokenFor } from './helpers/h3Harness'
import { apiTokenRepository } from '../server/repositories/apiTokenRepository'
import { findFreeIPs } from '../server/utils/ipv4'

const now = () => new Date().toISOString()

describe('free IP endpoint (plan A4)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteId: string

  beforeAll(async () => {
    installH3Globals()
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
    siteId = (await seedSite(prisma, { slug: 'hq' })).id
  })

  const alloc = (networkId: string, ip: string) => prisma.ipAllocation.create({
    data: { id: randomUUID(), network_id: networkId, ip_address: ip, status: 'active', created_at: now(), updated_at: now() }
  })

  it('skips network/broadcast, allocations and every IpRange type in ascending order', async () => {
    const net = await seedNetwork(prisma, { site_id: siteId, slug: 'n', subnet: '10.0.0.0/24' })
    await alloc(net.id, '10.0.0.1')
    await alloc(net.id, '10.0.0.3')
    await seedIpRange(prisma, { network_id: net.id, start_ip: '10.0.0.4', end_ip: '10.0.0.6', type: 'dhcp' })
    await seedIpRange(prisma, { network_id: net.id, start_ip: '10.0.0.8', end_ip: '10.0.0.8', type: 'static' })
    await seedIpRange(prisma, { network_id: net.id, start_ip: '10.0.0.9', end_ip: '10.0.0.10', type: 'reserved' })
    await alloc(net.id, '10.0.0.100')

    const viewer = await seedLocalUser(prisma, { username: 'v', role: 'viewer' })
    const ok = await dispatch({ path: `/api/networks/${net.id}/free-ips?count=4`, cookies: asCookie(tokenFor(viewer)) })
    expect(ok.status).toBe(200)
    expect((ok.body as { free_ips: string[] }).free_ips).toEqual(['10.0.0.2', '10.0.0.7', '10.0.0.11', '10.0.0.12'])
    expect((ok.body as { advisory: string }).advisory).toMatch(/advisory/i)
  })

  it('returns instantly for a huge reserved interval in a /8 (interval skipping, not per-address scan)', async () => {
    const net = await seedNetwork(prisma, { site_id: siteId, slug: 'big', subnet: '10.0.0.0/8' })
    await seedIpRange(prisma, { network_id: net.id, start_ip: '10.0.0.1', end_ip: '10.250.255.254', type: 'reserved' })
    const started = Date.now()
    const res = await dispatch({ path: `/api/networks/${net.id}/free-ips?count=3`, skipMiddleware: true })
    expect(res.status).toBe(200)
    expect((res.body as { free_ips: string[] }).free_ips).toEqual(['10.250.255.255', '10.251.0.0', '10.251.0.1'])
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('merges overlapping reserved intervals', async () => {
    const result = findFreeIPs('10.0.0.0/24', [], [
      { start_ip: '10.0.0.5', end_ip: '10.0.0.10' },
      { start_ip: '10.0.0.8', end_ip: '10.0.0.20' }
    ], 5)
    expect(result).toEqual(['10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.4', '10.0.0.21'])
  })

  it('handles /31 (both addresses usable) and /32', async () => {
    const p2p = await seedNetwork(prisma, { site_id: siteId, slug: 'p2p', subnet: '10.9.0.0/31' })
    const all = await dispatch({ path: `/api/networks/${p2p.id}/free-ips?count=5`, skipMiddleware: true })
    expect((all.body as { free_ips: string[] }).free_ips).toEqual(['10.9.0.0', '10.9.0.1'])

    await alloc(p2p.id, '10.9.0.0')
    const rest = await dispatch({ path: `/api/networks/${p2p.id}/free-ips?count=5`, skipMiddleware: true })
    expect((rest.body as { free_ips: string[] }).free_ips).toEqual(['10.9.0.1'])

    const host = await seedNetwork(prisma, { site_id: siteId, slug: 'host', subnet: '10.9.0.7/32' })
    const only = await dispatch({ path: `/api/networks/${host.id}/free-ips?count=5`, skipMiddleware: true })
    expect((only.body as { free_ips: string[] }).free_ips).toEqual(['10.9.0.7'])
  })

  it('stops at the broadcast boundary and returns fewer than requested when exhausted', async () => {
    const net = await seedNetwork(prisma, { site_id: siteId, slug: 'small', subnet: '10.0.0.0/30' })
    const res = await dispatch({ path: `/api/networks/${net.id}/free-ips?count=10`, skipMiddleware: true })
    expect((res.body as { free_ips: string[] }).free_ips).toEqual(['10.0.0.1', '10.0.0.2'])
    expect((res.body as { count: number }).count).toBe(2)
  })

  it('404s for an unknown network', async () => {
    const res = await dispatch({ path: `/api/networks/${randomUUID()}/free-ips`, skipMiddleware: true })
    expect(res.status).toBe(404)
  })

  it.each([['0'], ['101'], ['abc'], ['1.5'], ['-1']])('rejects count=%s with 400', async (count) => {
    const net = await seedNetwork(prisma, { site_id: siteId, slug: `c-${count}`, subnet: '10.0.0.0/24' })
    const res = await dispatch({ path: `/api/networks/${net.id}/free-ips?count=${count}`, skipMiddleware: true })
    expect(res.status).toBe(400)
  })

  it('defaults count to 1 and lets API tokens read', async () => {
    const net = await seedNetwork(prisma, { site_id: siteId, slug: 'tok', subnet: '10.0.0.0/24' })
    const owner = await seedLocalUser(prisma, { username: 'api', role: 'viewer' })
    const created = await apiTokenRepository.create(owner.id, { name: 'mcp' })
    if (!created.ok) throw new Error(created.reason)
    const res = await dispatch({ path: `/api/networks/${net.id}/free-ips`, headers: { authorization: `Bearer ${created.token.token}` } })
    expect(res.status).toBe(200)
    expect((res.body as { free_ips: string[] }).free_ips).toEqual(['10.0.0.1'])
  })
})
