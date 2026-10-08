import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { asCookie, installH3Globals, makeEvent, seedLocalUser, tokenFor } from './helpers/h3Harness'

type Handler = (event: unknown) => unknown
interface Res { status: number, body?: unknown }
interface Sw { id: string, name: string }

// Real auth middleware + real DELETE handler on an isolated DB. setResponseStatus is stubbed by the
// vitest setup, so success is observed as 200 only (no literal 201/204, no native HTTP).
describe('DELETE /api/switches/[id]/ports/[portId] counterpart reset', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let adminCookies: Record<string, string>
  let viewerCookies: Record<string, string>
  let siteId: string
  let sw1: Sw
  let sw2: Sw
  let a: string
  let b: string

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
    sw1 = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SW01', slug: 'sw01' })), name: 'SW01' }
    sw2 = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SW02', slug: 'sw02' })), name: 'SW02' }
    a = await seedPort(sw1.id, 1)
    b = await seedPort(sw2.id, 1)
    await link(a, sw1, b, sw2)
  })

  async function seedPort(switchId: string, index: number): Promise<string> {
    const id = randomUUID()
    await prisma.port.create({ data: { id, switch_id: switchId, unit: 1, index, label: `1/${index}`, type: 'rj45', status: 'up', tagged_vlans: '[]' } })
    return id
  }
  const extras = { speed: '1G', description: 'desc', mac_address: 'aa:bb', helper_usage: 'ap', helper_label: 'AP-1', show_in_helper_list: true, poe: JSON.stringify({ type: '802.3af', max_watts: 15 }), access_vlan: 20, native_vlan: 30, tagged_vlans: '[10,20]' }
  async function link(x: string, xs: Sw, y: string, ys: Sw): Promise<void> {
    await prisma.port.update({ where: { id: x }, data: { ...extras, port_mode: 'access', connected_device: ys.name, connected_device_id: ys.id, connected_port: '1/1', connected_port_id: y } })
    await prisma.port.update({ where: { id: y }, data: { ...extras, port_mode: 'access', connected_device: xs.name, connected_device_id: xs.id, connected_port: '1/1', connected_port_id: x } })
  }
  const snap = async () => ({ ports: await prisma.port.findMany({ orderBy: { id: 'asc' } }), switches: (await prisma.switch.findMany({ orderBy: { id: 'asc' } })).map(s => [s.id, s.updated_at]) })

  async function del(switchId: string, portId: string, body?: unknown, cookies: Record<string, string> = adminCookies): Promise<Res & { error?: { message?: string } }> {
    const event = makeEvent({ method: 'DELETE', path: `/api/switches/${switchId}/ports/${portId}`, cookies, body })
    event.context.params = { id: switchId, portId }
    try {
      const { default: mw } = await import('../server/middleware/auth')
      await (mw as Handler)(event)
      const { default: handler } = await import('../server/api/switches/[id]/ports/[portId].delete')
      return { status: 200, body: await (handler as Handler)(event) }
    } catch (err) {
      const e = err as { statusCode?: number, message?: string }
      return { status: e.statusCode ?? 500, error: { message: e.message } }
    }
  }
  const optIn = (expected: string) => ({ reset_counterpart: true, expected_counterpart_port_id: expected })
  const row = (id: string) => prisma.port.findUniqueOrThrow({ where: { id } })

  it('without a body (or reset_counterpart false) keeps the legacy behaviour: the peer only loses the link', async () => {
    for (const body of [undefined, {}, { reset_counterpart: false }]) {
      await resetDb()
      adminCookies = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'root', role: 'admin' })))
      siteId = (await seedSite(prisma, { slug: 'rst' })).id
      sw1 = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SW01', slug: 'sw01' })), name: 'SW01' }
      sw2 = { ...(await seedSwitch(prisma, { site_id: siteId, name: 'SW02', slug: 'sw02' })), name: 'SW02' }
      a = await seedPort(sw1.id, 1); b = await seedPort(sw2.id, 1); await link(a, sw1, b, sw2)
      const res = await del(sw1.id, a, body)
      expect(res.status).toBe(200)
      expect(await row(a)).toMatchObject({ status: 'down', port_mode: null, access_vlan: null, connected_port_id: null, description: null })
      expect(await row(b)).toMatchObject({ status: 'up', port_mode: 'access', access_vlan: 20, description: 'desc', connected_device: null, connected_device_id: null, connected_port_id: null, connected_port: null })
    }
  })

  it('reset_counterpart true resets both Access ports fully and keeps metadata, PoE and helpers', async () => {
    const third = await seedPort(sw2.id, 2); await prisma.port.update({ where: { id: third }, data: { ...extras, port_mode: 'access' } })
    const thirdBefore = await row(third)
    const res = await del(sw1.id, a, optIn(b))
    expect(res.status).toBe(200)
    for (const id of [a, b]) {
      const r = await row(id)
      expect(r).toMatchObject({ status: 'down', speed: null, port_mode: null, access_vlan: null, native_vlan: null, tagged_vlans: '[]', connected_device: null, connected_device_id: null, connected_port: null, connected_port_id: null, connected_allocation_id: null, description: null, mac_address: null })
      expect(r).toMatchObject({ poe: extras.poe, helper_usage: 'ap', helper_label: 'AP-1', show_in_helper_list: true, label: '1/1', type: 'rj45', unit: 1, index: 1, lag_group_id: null })
    }
    expect(await row(third)).toEqual(thirdBefore)
    expect((await prisma.switch.findUniqueOrThrow({ where: { id: sw2.id } })).updated_at).toBe((await prisma.switch.findUniqueOrThrow({ where: { id: sw1.id } })).updated_at)
  })

  it('rejects a missing expected id, unknown keys and wrong types with 400 and no change', async () => {
    const before = await snap()
    for (const body of [{ reset_counterpart: true }, { reset_counterpart: true, expected_counterpart_port_id: b, extra: 1 }, { reset_counterpart: 'yes', expected_counterpart_port_id: b }, { reset_counterpart: true, expected_counterpart_port_id: '' }, { expected_counterpart_port_id: 5 }]) {
      expect((await del(sw1.id, a, body)).status).toBe(400)
    }
    expect(await snap()).toEqual(before)
  })

  it('a stale expected id, a moved back-pointer or a foreign-switch target is 409 with full rollback', async () => {
    const before = await snap()
    expect((await del(sw1.id, a, optIn(randomUUID()))).status).toBe(409)
    await prisma.port.update({ where: { id: b }, data: { connected_port_id: randomUUID() } })
    const moved = await snap()
    expect((await del(sw1.id, a, optIn(b))).status).toBe(409)
    expect(await snap()).toEqual(moved)
    await prisma.port.update({ where: { id: b }, data: { connected_port_id: a } })
    const sw3 = await seedSwitch(prisma, { site_id: siteId, name: 'SW03', slug: 'sw03' })
    await prisma.port.update({ where: { id: a }, data: { connected_device_id: sw3.id } })
    const foreign = await snap()
    expect((await del(sw1.id, a, optIn(b))).status).toBe(409)
    expect(await snap()).toEqual(foreign)
    expect(before.ports.length).toBe(2)
  })

  it('a Trunk source, a Trunk peer or a LAG member is 409 with full rollback', async () => {
    await prisma.port.update({ where: { id: a }, data: { port_mode: 'trunk' } })
    let state = await snap(); expect((await del(sw1.id, a, optIn(b))).status).toBe(409); expect(await snap()).toEqual(state)
    await prisma.port.update({ where: { id: a }, data: { port_mode: 'access' } })
    await prisma.port.update({ where: { id: b }, data: { port_mode: 'trunk' } })
    state = await snap(); expect((await del(sw1.id, a, optIn(b))).status).toBe(409); expect(await snap()).toEqual(state)
    await prisma.port.update({ where: { id: b }, data: { port_mode: 'access' } })
    const extra = await seedPort(sw2.id, 2)
    const { lagGroupRepository } = await import('../server/repositories/lagGroupRepository')
    await lagGroupRepository.create(sw2.id, { name: 'LAG1', port_ids: [b, extra] })
    state = await snap(); expect((await del(sw1.id, a, optIn(b))).status).toBe(409); expect(await snap()).toEqual(state)
  })

  it('a same-switch counterpart resets both ports and bumps the one switch once', async () => {
    const c = await seedPort(sw1.id, 2); const d = await seedPort(sw1.id, 3)
    await link(c, sw1, d, sw1)
    const res = await del(sw1.id, c, optIn(d))
    expect(res.status).toBe(200)
    expect(await row(c)).toMatchObject({ status: 'down', port_mode: null, connected_port_id: null })
    expect(await row(d)).toMatchObject({ status: 'down', port_mode: null, connected_port_id: null })
    expect(await row(a)).toMatchObject({ status: 'up', port_mode: 'access' })
  })

  it('a viewer gets 403 and nothing changes', async () => {
    const before = await snap()
    expect((await del(sw1.id, a, optIn(b), viewerCookies)).status).toBe(403)
    expect(await snap()).toEqual(before)
  })
})
