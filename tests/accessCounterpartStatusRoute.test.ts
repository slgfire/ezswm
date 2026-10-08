import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { asCookie, installH3Globals, makeEvent, seedLocalUser, tokenFor } from './helpers/h3Harness'

type Handler = (event: unknown) => unknown
interface Res { status: number, body?: Record<string, unknown>, error?: { message?: string, statusMessage?: string, data?: { reason?: string } } }
interface Sw { id: string, name: string }

// Real auth middleware + real port PUT handler on an isolated DB. setResponseStatus is stubbed by the vitest
// setup, so success is observed as a derived 200 only (not a native HTTP status).
describe('PUT port: optional counterpart status Up (Access, reciprocal)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let admin: Record<string, string>
  let viewer: Record<string, string>
  let siteId: string
  let A: Sw
  let B: Sw

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
    admin = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'root', role: 'admin' })))
    viewer = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'view', role: 'viewer' })))
    siteId = (await seedSite(prisma, { slug: 'cps' })).id
    A = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SWA', slug: 'swa' })), name: 'SWA' }
    B = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SWB', slug: 'swb' })), name: 'SWB' }
  })

  const meta = { speed: '1G', description: 'peer-desc', mac_address: 'aa:bb', helper_usage: 'ap', helper_label: 'AP-1', show_in_helper_list: true, poe: JSON.stringify({ type: '802.3af', max_watts: 15 }), access_vlan: 20, tagged_vlans: '[]' }
  async function mk(switchId: string, index: number, data: Record<string, unknown> = {}): Promise<string> {
    const id = randomUUID()
    await prisma.port.create({ data: { id, switch_id: switchId, unit: 1, index, label: `1/${index}`, type: 'rj45', status: 'up', tagged_vlans: '[]', port_mode: 'access', ...data } as never })
    return id
  }
  /** Reciprocal Access pair p (on sw x) <-> q (on sw y). */
  async function pair(x: Sw, y: Sw, ps: string, qs: string, qExtra: Record<string, unknown> = {}) {
    const p = await mk(x.id, 1, { status: ps })
    const q = await mk(y.id, x === y ? 2 : 1, { status: qs, ...meta, ...qExtra })
    await prisma.port.update({ where: { id: p }, data: { connected_device: y.name, connected_device_id: y.id, connected_port: '1/x', connected_port_id: q } })
    await prisma.port.update({ where: { id: q }, data: { connected_device: x.name, connected_device_id: x.id, connected_port: '1/1', connected_port_id: p } })
    return { p, q }
  }
  const stamp = async (s: Sw) => (await prisma.switch.findUniqueOrThrow({ where: { id: s.id } })).updated_at
  const raw = async () => JSON.stringify({ ports: await prisma.port.findMany({ orderBy: { id: 'asc' } }), switches: await prisma.switch.findMany({ orderBy: { id: 'asc' } }) })
  const row = (id: string) => prisma.port.findUniqueOrThrow({ where: { id } })
  const opts = async (y: Sw, q: string, over: Record<string, unknown> = {}) => ({ counterpart_status_up: true, expected_counterpart_port_id: q, expected_counterpart_status: 'down', expected_counterpart_switch_updated_at: await stamp(y), ...over })

  async function put(sw: Sw, portId: string, body: unknown, cookies: Record<string, string> = admin): Promise<Res> {
    const event = makeEvent({ method: 'PUT', path: `/api/switches/${sw.id}/ports/${portId}`, cookies, body })
    event.context.params = { id: sw.id, portId }
    try {
      const { default: mw } = await import('../server/middleware/auth')
      await (mw as Handler)(event)
      const { default: handler } = await import('../server/api/switches/[id]/ports/[portId].put')
      return { status: 200, body: await (handler as Handler)(event) as Record<string, unknown> }
    } catch (err) {
      const e = err as { statusCode?: number, message?: string, statusMessage?: string, data?: { reason?: string } }
      return { status: e.statusCode ?? 500, error: { message: e.message, statusMessage: e.statusMessage, data: e.data } }
    }
  }
  async function expectConflict(sw: Sw, portId: string, body: unknown) {
    const before = await raw()
    const res = await put(sw, portId, body)
    expect(res.status).toBe(409)
    expect(res.error?.data?.reason).toBe('counterpart_status_conflict')
    expect(await raw()).toBe(before)
  }

  it('source up + peer down + option true: peer goes Up with preserved metadata, source link intact, peer switch stamp bumped', async () => {
    const { p, q } = await pair(A, B, 'up', 'down')
    const bStamp = await stamp(B)
    const res = await put(A, p, { status: 'up', ...(await opts(B, q)) })
    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('counterpart_status_up')
    const peer = await row(q)
    expect(peer).toMatchObject({ status: 'up', ...meta, port_mode: 'access', connected_port_id: p, connected_device_id: A.id })
    expect(await row(p)).toMatchObject({ status: 'up', connected_port_id: q })
    expect(await stamp(B)).not.toBe(bStamp)
  })

  it('option false/absent leaves a down peer untouched; plain up/up save and source-down/peer-up are local-only', async () => {
    for (const body of [{ status: 'up' }, { status: 'up', counterpart_status_up: false }]) {
      await resetDb(); admin = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'root', role: 'admin' })))
      siteId = (await seedSite(prisma, { slug: 'cps' })).id
      A = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SWA', slug: 'swa' })), name: 'SWA' }
      B = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SWB', slug: 'swb' })), name: 'SWB' }
      const { p, q } = await pair(A, B, 'up', 'down')
      const peerBefore = await row(q)
      expect((await put(A, p, body)).status).toBe(200)
      expect(await row(q)).toEqual(peerBefore)
    }
    const up = await pair(A, B, 'up', 'up')
    const peerBefore = await row(up.q)
    expect((await put(A, up.p, { status: 'up', description: 'x' })).status).toBe(200)
    expect(await row(up.q)).toEqual(peerBefore)
    expect((await put(A, up.p, { status: 'down' })).status).toBe(200)
    expect(await row(up.q)).toEqual(peerBefore)
    expect((await row(up.p)).status).toBe('down')
  })

  it('source down + option true with a peer that is already Up is a no-op on the peer even with an outdated switch stamp', async () => {
    const { p, q } = await pair(A, B, 'up', 'up')
    const body = await opts(B, q, { expected_counterpart_switch_updated_at: '2000-01-01T00:00:00.000Z' })
    const peerBefore = await row(q); const bStamp = await stamp(B)
    const res = await put(A, p, { status: 'down', ...body })
    expect(res.status).toBe(200)
    expect(await row(q)).toEqual(peerBefore)
    expect(await stamp(B)).toBe(bStamp)
    expect((await row(p)).status).toBe('down')
  })

  it('a new connection to a free Access peer with the option links both ends and sets the peer Up', async () => {
    const p = await mk(A.id, 1, { status: 'down' })
    const q = await mk(B.id, 1, { status: 'down' })
    const res = await put(A, p, { status: 'up', port_mode: 'access', connected_device: B.name, connected_device_id: B.id, connected_port: '1/1', connected_port_id: q, ...(await opts(B, q)) })
    expect(res.status).toBe(200)
    expect(await row(p)).toMatchObject({ status: 'up', connected_port_id: q, connected_device_id: B.id })
    expect(await row(q)).toMatchObject({ status: 'up', connected_port_id: p, connected_device_id: A.id })
  })

  it('missing expected fields or malformed values are 400 with no change', async () => {
    const { p, q } = await pair(A, B, 'up', 'down')
    const full = await opts(B, q)
    const before = await raw()
    for (const body of [
      { counterpart_status_up: true },
      { ...full, expected_counterpart_port_id: undefined },
      { ...full, expected_counterpart_status: undefined },
      { ...full, expected_counterpart_switch_updated_at: undefined },
      { ...full, expected_counterpart_status: 'up' },
      { ...full, expected_counterpart_port_id: '' }
    ]) expect((await put(A, p, { status: 'up', ...body })).status).toBe(400)
    expect(await raw()).toBe(before)
  })

  it('an outdated peer switch stamp on a Down peer is 409 with full rollback of both switches and ports', async () => {
    const { p, q } = await pair(A, B, 'up', 'down')
    const body = await opts(B, q)
    await prisma.switch.update({ where: { id: B.id }, data: { updated_at: new Date(Date.now() + 5000).toISOString() } })
    await expectConflict(A, p, { status: 'down', description: 'changed', ...body })
    expect((await row(q)).status).toBe('down')
  })

  it('a stale source version is the distinct existing 409 without a counterpart reason', async () => {
    const { p, q } = await pair(A, B, 'up', 'down')
    const before = await raw()
    const res = await put(A, p, { status: 'up', expected_updated_at: '2000-01-01T00:00:00.000Z', ...(await opts(B, q)) })
    expect(res.status).toBe(409)
    expect(res.error?.statusMessage).toBe('Switch was modified since page load')
    expect(res.error?.data?.reason).toBeUndefined()
    expect(await raw()).toBe(before)
  })

  it('disabled, Trunk, LAG and Console source or target are 409 with full rollback', async () => {
    const { p, q } = await pair(A, B, 'up', 'down')
    const lag = randomUUID(); const now = new Date().toISOString()
    await prisma.lagGroup.create({ data: { id: lag, switch_id: B.id, name: 'LAG1', created_at: now, updated_at: now } as never })
    for (const [id, patch] of [[q, { status: 'disabled' }], [q, { port_mode: 'trunk' }], [q, { lag_group_id: lag }], [q, { type: 'console' }], [p, { port_mode: 'trunk' }], [p, { type: 'console' }]] as const) {
      const orig = await row(id)
      await prisma.port.update({ where: { id }, data: patch as never })
      await expectConflict(A, p, { status: 'up', ...(await opts(B, q)) })
      await prisma.port.update({ where: { id }, data: { status: orig.status, port_mode: orig.port_mode, lag_group_id: orig.lag_group_id, type: orig.type } })
    }
    expect((await put(A, p, { status: 'disabled', ...(await opts(B, q)) })).status).toBe(409)
    expect((await row(q)).status).toBe('down')
  })

  it('a moved expected id, a foreign-occupied peer, a half link, a foreign switch and a self peer are 409 with full rollback', async () => {
    const { p, q } = await pair(A, B, 'up', 'down')
    await expectConflict(A, p, { status: 'up', ...(await opts(B, randomUUID())) })
    await expectConflict(A, p, { status: 'up', ...(await opts(B, q)), connected_port_id: p })
    const C = await seedSwitch(prisma, { site_id: siteId, name: 'SWC', slug: 'swc' })
    await expectConflict(A, p, { status: 'up', ...(await opts(B, q)), connected_device_id: C.id })
    const other = await mk(A.id, 9)
    await prisma.port.update({ where: { id: q }, data: { connected_port_id: other } })
    await expectConflict(A, p, { status: 'up', ...(await opts(B, q)) })
    await prisma.port.update({ where: { id: q }, data: { connected_port_id: p, connected_device_id: null } })
    await expectConflict(A, p, { status: 'up', ...(await opts(B, q)) })
  })

  it('a same-switch peer is compared against the pre-write stamp and the switch is bumped once', async () => {
    const { p, q } = await pair(A, A, 'up', 'down')
    const body = await opts(A, q)
    const before = await stamp(A)
    const res = await put(A, p, { status: 'up', ...body })
    expect(res.status).toBe(200)
    expect((await row(q)).status).toBe('up')
    expect(await stamp(A)).not.toBe(before)
    expect(await stamp(A)).toBe(res.body?.updated_at)
  })

  it('preserves peer VLAN/description/MAC/PoE/helpers and unrelated ports; metadata-free saves stay legacy', async () => {
    const { p, q } = await pair(A, B, 'up', 'down')
    const other = await mk(B.id, 5, { ...meta })
    const otherBefore = await row(other)
    const swBefore = await prisma.switch.findUniqueOrThrow({ where: { id: B.id } })
    expect((await put(A, p, { status: 'up', ...(await opts(B, q)) })).status).toBe(200)
    expect(await row(other)).toEqual(otherBefore)
    expect(await row(q)).toMatchObject({ ...meta, label: '1/1', type: 'rj45' })
    expect((await prisma.switch.findUniqueOrThrow({ where: { id: B.id } })).configured_vlans).toBe(swBefore.configured_vlans)
  })

  it('a viewer gets 403 and nothing changes', async () => {
    const { p, q } = await pair(A, B, 'up', 'down')
    const before = await raw()
    expect((await put(A, p, { status: 'up', ...(await opts(B, q)) }, viewer)).status).toBe(403)
    expect(await raw()).toBe(before)
  })
})
