import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { asCookie, installH3Globals, makeEvent, seedLocalUser, tokenFor } from './helpers/h3Harness'

type Handler = (event: unknown) => unknown
interface PutResult { status: number, body?: unknown, error?: { message?: string, data?: unknown } }
interface PortView {
  mode: string | null
  access: number | null
  native: number | null
  tagged: string
  device: string | null
  deviceId: string | null
  port: string | null
  portId: string | null
  description: string | null
}

// Runs the REAL auth middleware and the REAL port PUT handler on an isolated database.
// setResponseStatus is stubbed by the vitest setup, so success is observed as 200 only
// (no literal 201/204 and no native HTTP).
describe('port connection routes: reciprocal peer behaviour', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let cookies: Record<string, string>
  let sw1: { id: string }
  let sw3: { id: string }
  let p1: string
  let p3: string

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
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    cookies = asCookie(tokenFor(admin))
    const site = await seedSite(prisma, { slug: 'diag' })
    sw1 = await seedSwitch(prisma, { site_id: site.id, name: 'SW01', slug: 'sw01' })
    sw3 = await seedSwitch(prisma, { site_id: site.id, name: 'SW03', slug: 'sw03' })
    p1 = await seedPort(sw1.id, '1/3', 3)
    p3 = await seedPort(sw3.id, '1/4', 4)
  })

  async function seedPort(switchId: string, label: string, index: number): Promise<string> {
    const id = randomUUID()
    await prisma.port.create({ data: { id, switch_id: switchId, unit: 1, index, label, type: 'rj45', status: 'up', tagged_vlans: '[]' } })
    return id
  }

  async function seedVlan(siteId: string, vlanId: number): Promise<void> {
    const now = new Date().toISOString()
    await prisma.vlan.create({ data: { id: randomUUID(), site_id: siteId, vlan_id: vlanId, name: `V${vlanId}`, status: 'active', color: '#0000ff', created_at: now, updated_at: now } })
  }

  async function linkDirectly(): Promise<void> {
    await prisma.port.update({ where: { id: p3 }, data: { port_mode: 'access', connected_device: 'SW01', connected_device_id: sw1.id, connected_port: '1/3', connected_port_id: p1, description: 'keep me' } })
    await prisma.port.update({ where: { id: p1 }, data: { port_mode: 'access', connected_device: 'SW03', connected_device_id: sw3.id, connected_port: '1/4', connected_port_id: p3 } })
  }

  async function view(portId: string): Promise<PortView> {
    const p = await prisma.port.findUniqueOrThrow({ where: { id: portId } })
    return { mode: p.port_mode, access: p.access_vlan, native: p.native_vlan, tagged: p.tagged_vlans, device: p.connected_device, deviceId: p.connected_device_id, port: p.connected_port, portId: p.connected_port_id, description: p.description }
  }

  async function putPort(switchId: string, portId: string, body: Record<string, unknown>): Promise<PutResult> {
    const sw = await prisma.switch.findUniqueOrThrow({ where: { id: switchId } })
    const event = makeEvent({ method: 'PUT', path: `/api/switches/${switchId}/ports/${portId}`, cookies, body: { expected_updated_at: sw.updated_at, ...body } })
    event.context.params = { id: switchId, portId }
    try {
      const { default: mw } = await import('../server/middleware/auth')
      await (mw as Handler)(event)
      const { default: handler } = await import('../server/api/switches/[id]/ports/[portId].put')
      return { status: 200, body: await (handler as Handler)(event) }
    } catch (err) {
      const e = err as { statusCode?: number, message?: string, data?: unknown }
      return { status: e.statusCode ?? 500, error: { message: e.message, data: e.data } }
    }
  }

  const connectBody = (peerSwitch: { id: string }, peerName: string, peerLabel: string, peerPort: string) => ({
    connected_device: peerName, connected_device_id: peerSwitch.id, connected_port: peerLabel, connected_port_id: peerPort
  })

  it('creates reciprocal Access link without VLAN copy', async () => {
    const res = await putPort(sw3.id, p3, { ...connectBody(sw1, 'SW01', '1/3', p1), port_mode: 'access', access_vlan: null, native_vlan: null, tagged_vlans: [], add_vlans_to_target_switch: false })
    // Local handler is already correct: accepted and the source holds the peer IDs.
    expect(res.error).toBeUndefined()
    expect(res.status).toBe(200)
    const source = await view(p3)
    expect(source).toMatchObject({ mode: 'access', access: null, device: 'SW01', deviceId: sw1.id, port: '1/3', portId: p1, tagged: '[]' })
    // Desired behaviour (DESIGNED RED today): the peer carries the reverse connection too.
    const peer = await view(p1)
    expect(peer).toMatchObject({ device: 'SW03', deviceId: sw3.id, port: '1/4', portId: p3 })
  })

  it('with a VLAN the existing copy and field group stay unchanged', async () => {
    const site = await prisma.switch.findUniqueOrThrow({ where: { id: sw3.id } })
    await seedVlan(site.site_id, 20)
    const res = await putPort(sw3.id, p3, { ...connectBody(sw1, 'SW01', '1/3', p1), port_mode: 'access', access_vlan: 20, native_vlan: null, tagged_vlans: [], add_vlans_to_target_switch: true })
    expect(res.status).toBe(200)
    expect(await view(p3)).toMatchObject({ mode: 'access', access: 20, deviceId: sw1.id, portId: p1 })
    expect(await view(p1)).toMatchObject({ mode: 'access', access: 20, native: null, tagged: '[]', device: 'SW03', deviceId: sw3.id, port: '1/4', portId: p3 })
  })

  it('metadata-only description save keeps both peers and empty fields', async () => {
    await linkDirectly()
    const before = { source: await view(p3), peer: await view(p1) }
    const res = await putPort(sw3.id, p3, { description: 'changed' })
    expect(res.status).toBe(200)
    expect(await view(p3)).toEqual({ ...before.source, description: 'changed' })
    expect(await view(p1)).toEqual(before.peer)
  })

  it('disconnect clears both sides completely', async () => {
    await linkDirectly()
    const res = await putPort(sw3.id, p3, { connected_device: null, connected_device_id: null, connected_port: null, connected_port_id: null })
    expect(res.status).toBe(200)
    expect(await view(p3)).toMatchObject({ device: null, deviceId: null, port: null, portId: null })
    expect(await view(p1)).toMatchObject({ device: null, deviceId: null, port: null, portId: null })
  })

  const swUpdated = async (id: string): Promise<string> => (await prisma.switch.findUniqueOrThrow({ where: { id } })).updated_at
  const empty = { device: null, deviceId: null, port: null, portId: null }
  async function pair(a: { sw: { id: string, name: string }, id: string, label: string }, b: { sw: { id: string, name: string }, id: string, label: string }): Promise<void> {
    await prisma.port.update({ where: { id: a.id }, data: { port_mode: 'access', connected_device: b.sw.name, connected_device_id: b.sw.id, connected_port: b.label, connected_port_id: b.id } })
    await prisma.port.update({ where: { id: b.id }, data: { port_mode: 'access', connected_device: a.sw.name, connected_device_id: a.sw.id, connected_port: a.label, connected_port_id: a.id } })
  }

  it('explicit null, empty string or a partial clear nulls both IDs and keeps the free-text fields', async () => {
    for (const clear of [{ connected_device_id: null, connected_port_id: null }, { connected_device_id: '', connected_port_id: '' }, { connected_device_id: null }]) {
      await resetDb()
      const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
      cookies = asCookie(tokenFor(admin))
      const site = await seedSite(prisma, { slug: 'clr' })
      sw1 = await seedSwitch(prisma, { site_id: site.id, name: 'SW01', slug: 'sw01' })
      sw3 = await seedSwitch(prisma, { site_id: site.id, name: 'SW03', slug: 'sw03' })
      p1 = await seedPort(sw1.id, '1/3', 3)
      p3 = await seedPort(sw3.id, '1/4', 4)
      await pair({ sw: { id: sw3.id, name: 'SW03' }, id: p3, label: '1/4' }, { sw: { id: sw1.id, name: 'SW01' }, id: p1, label: '1/3' })
      const res = await putPort(sw3.id, p3, { ...clear, connected_device: 'Custom', connected_port: 'free text' })
      expect(res.status).toBe(200)
      expect(await view(p3)).toMatchObject({ device: 'Custom', port: 'free text', deviceId: null, portId: null })
      expect(await view(p1)).toMatchObject({ ...empty, mode: 'access' })
    }
  })

  it('healthy unchanged IDs write no peer row or timestamp; a broken back-pointer is repaired', async () => {
    await linkDirectly()
    const peerBefore = await prisma.port.findUniqueOrThrow({ where: { id: p1 } })
    const stampBefore = await swUpdated(sw1.id)
    const res = await putPort(sw3.id, p3, { ...connectBody(sw1, 'SW01', '1/3', p1) })
    expect(res.status).toBe(200)
    expect(await prisma.port.findUniqueOrThrow({ where: { id: p1 } })).toEqual(peerBefore)
    expect(await swUpdated(sw1.id)).toBe(stampBefore)
    await prisma.port.update({ where: { id: p1 }, data: { connected_device: null, connected_device_id: null, connected_port: null, connected_port_id: null } })
    expect((await putPort(sw3.id, p3, { ...connectBody(sw1, 'SW01', '1/3', p1) })).status).toBe(200)
    expect(await view(p1)).toMatchObject({ device: 'SW03', deviceId: sw3.id, port: '1/4', portId: p3 })
  })

  it('a move unlinks the old peer and the new peer prior partner exactly, leaving a dirty third party untouched', async () => {
    const swRow = await prisma.switch.findUniqueOrThrow({ where: { id: sw3.id } })
    const sw2 = await seedSwitch(prisma, { site_id: swRow.site_id, name: 'SW02', slug: 'sw02' })
    const sw4 = await seedSwitch(prisma, { site_id: swRow.site_id, name: 'SW04', slug: 'sw04' })
    const p2 = await seedPort(sw2.id, '1/3', 3)
    const p4 = await seedPort(sw4.id, '1/3', 3)
    const dirty = await seedPort(sw1.id, '1/9', 9)
    await prisma.port.update({ where: { id: dirty }, data: { connected_device: 'SW03', connected_device_id: sw3.id, connected_port: '1/4', connected_port_id: p3 } })
    await pair({ sw: { id: sw3.id, name: 'SW03' }, id: p3, label: '1/4' }, { sw: { id: sw1.id, name: 'SW01' }, id: p1, label: '1/3' })
    await pair({ sw: { id: sw2.id, name: 'SW02' }, id: p2, label: '1/3' }, { sw: { id: sw4.id, name: 'SW04' }, id: p4, label: '1/3' })
    const dirtyBefore = await prisma.port.findUniqueOrThrow({ where: { id: dirty } })
    const res = await putPort(sw3.id, p3, { ...connectBody(sw2, 'SW02', '1/3', p2) })
    expect(res.status).toBe(200)
    expect(await view(p1)).toMatchObject({ ...empty, mode: 'access' })
    expect(await view(p4)).toMatchObject({ ...empty, mode: 'access' })
    expect(await view(p2)).toMatchObject({ device: 'SW03', deviceId: sw3.id, port: '1/4', portId: p3 })
    expect(await prisma.port.findUniqueOrThrow({ where: { id: dirty } })).toEqual(dirtyBefore)
  })

  it('rejects a missing peer (404), a wrong switch (409), a self link (400) and a stale stamp (409) without changes', async () => {
    const swRow = await prisma.switch.findUniqueOrThrow({ where: { id: sw3.id } })
    const sw2 = await seedSwitch(prisma, { site_id: swRow.site_id, name: 'SW02', slug: 'sw02' })
    const before = { source: await view(p3), peer: await view(p1) }
    expect((await putPort(sw3.id, p3, { ...connectBody(sw1, 'SW01', '1/3', randomUUID()) })).status).toBe(404)
    expect((await putPort(sw3.id, p3, { ...connectBody(sw2, 'SW02', '1/3', p1) })).status).toBe(409)
    expect((await putPort(sw3.id, p3, { ...connectBody(sw3, 'SW03', '1/4', p3) })).status).toBe(400)
    expect((await putPort(sw3.id, p3, { ...connectBody(sw1, 'SW01', '1/3', p1), expected_updated_at: '2000-01-01T00:00:00.000Z' })).status).toBe(409)
    expect({ source: await view(p3), peer: await view(p1) }).toEqual(before)
  })

  it('a LAG member peer is refused for a new link (409), while a healthy unchanged link still saves', async () => {
    const swRow = await prisma.switch.findUniqueOrThrow({ where: { id: sw1.id } })
    const extra = await seedPort(sw1.id, '1/4', 14)
    const { lagGroupRepository } = await import('../server/repositories/lagGroupRepository')
    await lagGroupRepository.create(sw1.id, { name: 'LAG1', port_ids: [p1, extra] })
    expect(swRow.id).toBe(sw1.id)
    const res = await putPort(sw3.id, p3, { ...connectBody(sw1, 'SW01', '1/3', p1) })
    expect(res.status).toBe(409)
    expect(await view(p1)).toMatchObject(empty)
    await prisma.port.update({ where: { id: p3 }, data: { port_mode: 'access', connected_device: 'SW01', connected_device_id: sw1.id, connected_port: '1/3', connected_port_id: p1 } })
    await prisma.port.update({ where: { id: p1 }, data: { connected_device: 'SW03', connected_device_id: sw3.id, connected_port: '1/4', connected_port_id: p3 } })
    expect((await putPort(sw3.id, p3, { ...connectBody(sw1, 'SW01', '1/3', p1) })).status).toBe(200)
  })

  it('a same-switch link returns the source updated_at that equals the database stamp', async () => {
    const other = await seedPort(sw3.id, '1/5', 5)
    const res = await putPort(sw3.id, p3, { ...connectBody(sw3, 'SW03', '1/5', other) })
    expect(res.status).toBe(200)
    expect((res.body as { updated_at: string }).updated_at).toBe(await swUpdated(sw3.id))
    expect(await view(other)).toMatchObject({ device: 'SW03', deviceId: sw3.id, port: '1/4', portId: p3 })
  })
})
