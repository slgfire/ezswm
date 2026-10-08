import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { asCookie, installH3Globals, makeEvent, seedLocalUser, tokenFor } from './helpers/h3Harness'

type Handler = (event: unknown) => unknown
interface Res { status: number, body?: unknown, error?: { message?: string, data?: { reason?: string } } }
interface Sw { id: string, name: string }

// Real auth middleware + real DELETE/PUT handlers on an isolated DB. setResponseStatus is stubbed by the
// vitest setup, so success is observed as 200 only (derived, not a native HTTP status).
describe('direct port reset is forbidden for LAG members', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let adminCookies: Record<string, string>
  let viewerCookies: Record<string, string>
  let siteId: string
  let A: Sw
  let B: Sw

  beforeAll(async () => {
    installH3Globals()
    ;(globalThis as unknown as { getRouterParam: (e: { context: { params?: Record<string, string> } }, n: string) => string | undefined }).getRouterParam = (e, n) => e.context.params?.[n]
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
    adminCookies = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'root', role: 'admin' })))
    viewerCookies = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'view', role: 'viewer' })))
    siteId = (await seedSite(prisma, { slug: 'rst' })).id
    const now = new Date().toISOString()
    await prisma.vlan.create({ data: { id: randomUUID(), site_id: siteId, vlan_id: 20, name: 'VLAN 20', status: 'active', color: '#000000', created_at: now, updated_at: now } })
    A = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SWA', slug: 'swa' })), name: 'SWA' }
    B = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SWB', slug: 'swb' })), name: 'SWB' }
  })

  async function mk(switchId: string, index: number, type = 'rj45'): Promise<string> {
    const id = randomUUID()
    await prisma.port.create({ data: { id, switch_id: switchId, unit: 1, index, label: `1/${index}`, type, status: 'up', tagged_vlans: '[]' } })
    return id
  }
  async function mirrored(n: number, type = 'rj45', mode: 'access' | 'trunk' = 'access') {
    const { lagGroupRepository } = await import('../server/repositories/lagGroupRepository')
    const local: string[] = []; const remote: string[] = []
    for (let i = 1; i <= n; i++) { local.push(await mk(A.id, i, type)); remote.push(await mk(B.id, i, type)) }
    const lag = await lagGroupRepository.create(A.id, {
      name: 'LAG1', remote_device_id: B.id, port_ids: local,
      sync: { remote_switch_id: B.id, mappings: local.map((l, i) => ({ local_port_id: l, remote_port_id: remote[i]! })), port_mode: mode, access_vlan: mode === 'access' ? 20 : null, native_vlan: null, tagged_vlans: mode === 'trunk' ? [20] : [] }
    } as never)
    return { local, remote, lag }
  }
  async function unsynced(n: number) {
    const { lagGroupRepository } = await import('../server/repositories/lagGroupRepository')
    const local: string[] = []
    for (let i = 1; i <= n; i++) local.push(await mk(A.id, i))
    const lag = await lagGroupRepository.create(A.id, { name: 'LAG1', port_ids: local })
    return { local, lag }
  }
  const raw = async () => JSON.stringify({
    ports: await prisma.port.findMany({ orderBy: { id: 'asc' } }),
    lags: await prisma.lagGroup.findMany({ orderBy: { id: 'asc' } }),
    switches: await prisma.switch.findMany({ orderBy: { id: 'asc' } })
  })

  async function run(loader: () => Promise<{ default: unknown }>, method: string, path: string, params: Record<string, string>, body?: unknown, cookies: Record<string, string> = adminCookies): Promise<Res> {
    const event = makeEvent({ method, path, cookies, body })
    event.context.params = params
    try {
      const { default: mw } = await import('../server/middleware/auth')
      await (mw as Handler)(event)
      const { default: handler } = await loader()
      return { status: 200, body: await (handler as Handler)(event) }
    } catch (err) {
      const e = err as { statusCode?: number, message?: string, data?: { reason?: string } }
      return { status: e.statusCode ?? 500, error: { message: e.message, data: e.data } }
    }
  }
  const del = (sw: Sw, portId: string, body?: unknown, cookies?: Record<string, string>) =>
    run(() => import('../server/api/switches/[id]/ports/[portId].delete'), 'DELETE', `/api/switches/${sw.id}/ports/${portId}`, { id: sw.id, portId }, body, cookies)
  const put = (sw: Sw, lagId: string, body: unknown) =>
    run(() => import('../server/api/switches/[id]/lag-groups/[lagId].put'), 'PUT', `/api/switches/${sw.id}/lag-groups/${lagId}`, { id: sw.id, lagId }, body)

  const MSG = 'LAG member ports must be managed through the LAG editor'
  async function expectForbidden(sw: Sw, portId: string, body?: unknown) {
    const before = await raw()
    const res = await del(sw, portId, body)
    expect(res.status).toBe(409)
    expect(res.error?.message).toBe(MSG)
    expect(res.error?.data?.reason).toBe('lag_member_reset_forbidden')
    expect(await raw()).toBe(before)
  }

  it('mirrored 2-member LAG: local and remote bodyless reset is 409 with no write', async () => {
    const m = await mirrored(2)
    await expectForbidden(A, m.local[0]!)
    await expectForbidden(B, m.remote[0]!)
  })

  it('mirrored 3-member LAG: {} and reset_counterpart false/true are all 409 with no write', async () => {
    const m = await mirrored(3)
    for (const body of [{}, { reset_counterpart: false }, { reset_counterpart: true, expected_counterpart_port_id: m.remote[1]! }]) {
      await expectForbidden(A, m.local[1]!, body)
      await expectForbidden(B, m.remote[1]!, body)
    }
  })

  it('opt-in counterpart reset on a member with the matching expected peer is 409 with the structured reason', async () => {
    const m = await mirrored(2)
    await expectForbidden(A, m.local[0]!, { reset_counterpart: true, expected_counterpart_port_id: m.remote[0]! })
  })

  it('unsynced 2- and 3-member LAGs forbid direct reset', async () => {
    for (const n of [2, 3]) {
      await resetDb()
      adminCookies = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'root', role: 'admin' })))
      siteId = (await seedSite(prisma, { slug: 'rst' })).id
      A = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SWA', slug: 'swa' })), name: 'SWA' }
      const u = await unsynced(n)
      await expectForbidden(A, u.local[0]!)
      await expectForbidden(A, u.local[n - 1]!, {})
    }
  })

  it('Trunk and SFP mirrored LAG members are forbidden too', async () => {
    const m = await mirrored(2, 'sfp', 'trunk')
    await expectForbidden(A, m.local[0]!)
    await expectForbidden(B, m.remote[1]!)
  })

  it('a viewer gets 403 and an unauthenticated caller 401, nothing changes', async () => {
    const m = await mirrored(2)
    const before = await raw()
    expect((await del(A, m.local[0]!, undefined, viewerCookies)).status).toBe(403)
    expect((await del(A, m.local[0]!, undefined, {})).status).toBe(401)
    expect(await raw()).toBe(before)
  })

  it('an ordinary non-LAG Access port still resets and keeps PoE and helper fields', async () => {
    const p = await mk(A.id, 1)
    const extras = { speed: '1G', description: 'd', port_mode: 'access', access_vlan: 20, helper_usage: 'ap', helper_label: 'AP-1', show_in_helper_list: true, poe: JSON.stringify({ type: '802.3af', max_watts: 15 }) }
    await prisma.port.update({ where: { id: p }, data: extras })
    const res = await del(A, p)
    expect(res.status).toBe(200)
    expect(await prisma.port.findUniqueOrThrow({ where: { id: p } })).toMatchObject({ status: 'down', speed: null, port_mode: null, access_vlan: null, description: null, lag_group_id: null, poe: extras.poe, helper_usage: 'ap', helper_label: 'AP-1', show_in_helper_list: true })
  })

  it('the LAG editor still saves a healthy mirrored mapping with a fresh version', async () => {
    const m = await mirrored(2)
    const stamp = (await prisma.switch.findUniqueOrThrow({ where: { id: A.id } })).updated_at
    const res = await put(A, m.lag.id, {
      port_ids: m.local, remote_device_id: B.id, expected_updated_at: stamp,
      sync: { remote_switch_id: B.id, mappings: m.local.map((l, i) => ({ local_port_id: l, remote_port_id: m.remote[i]! })), port_mode: 'access', access_vlan: 20, native_vlan: null, tagged_vlans: [] }
    })
    expect(res.status).toBe(200)
    const ports = await prisma.port.findMany({ where: { id: { in: [...m.local, ...m.remote] } } })
    expect(ports.every(p => p.lag_group_id && p.connected_port_id)).toBe(true)
  })

  it('removing a LAG below two members is rejected with 400 and nothing changes', async () => {
    const m = await mirrored(2)
    const { lagGroupRepository } = await import('../server/repositories/lagGroupRepository')
    const before = await raw()
    await expect(lagGroupRepository.update(m.lag.id, { port_ids: [m.local[0]!] })).rejects.toMatchObject({ statusCode: 400 })
    expect(await raw()).toBe(before)
  })
})
