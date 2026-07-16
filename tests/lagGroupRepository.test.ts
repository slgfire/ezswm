import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSwitch } from './testHelpers'
import { lagGroupRepository } from '../server/repositories/lagGroupRepository'

describe('lagGroupRepository integrity', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>

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

  beforeEach(() => resetDb())

  async function port(switchId: string) {
    return prisma.port.create({
      data: { id: randomUUID(), switch_id: switchId, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' }
    })
  }

  it('rejects a duplicate name on the same switch', async () => {
    const sw = await seedSwitch(prisma)
    const p1 = await port(sw.id); const p2 = await port(sw.id)
    await lagGroupRepository.create(sw.id, { name: 'lag1', port_ids: [p1.id, p2.id] })
    await expect(lagGroupRepository.create(sw.id, { name: 'lag1', port_ids: [p1.id, p2.id] }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('normalizes persisted names before checking order-sensitive duplicates', async () => {
    const sw = await seedSwitch(prisma)
    const p1 = await port(sw.id); const p2 = await port(sw.id)
    const created = await lagGroupRepository.create(sw.id, { name: ' LAG1 ', port_ids: [p1.id, p2.id] })

    expect(created.name).toBe('LAG1')
    await expect(lagGroupRepository.create(sw.id, { name: 'LAG1', port_ids: [p1.id, p2.id] }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('normalizes mirror names as well as local names', async () => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma)
    const lp = [await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id)]
    await lagGroupRepository.create(local.id, { name: '  mirrored  ', remote_device_id: remote.id, port_ids: lp.map(p => p.id), sync: { remote_switch_id: remote.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })), port_mode: 'access', access_vlan: null, native_vlan: null, tagged_vlans: [] } } as unknown as never)
    expect((await prisma.lagGroup.findMany({ where: { switch_id: remote.id } }))[0]?.name).toBe('mirrored')
  })

  it('allows the same name on different switches', async () => {
    const sw1 = await seedSwitch(prisma)
    const sw2 = await seedSwitch(prisma)
    const p1 = await port(sw1.id); const p2 = await port(sw1.id); const p3 = await port(sw2.id); const p4 = await port(sw2.id)
    await lagGroupRepository.create(sw1.id, { name: 'lag1', port_ids: [p1.id, p2.id] })
    await expect(lagGroupRepository.create(sw2.id, { name: 'lag1', port_ids: [p3.id, p4.id] })).resolves.toBeTruthy()
  })

  it('rejects renaming to another LAG name on the same switch', async () => {
    const sw = await seedSwitch(prisma); const p1 = await port(sw.id); const p2 = await port(sw.id); const p3 = await port(sw.id); const p4 = await port(sw.id)
    await lagGroupRepository.create(sw.id, { name: 'lag1', port_ids: [p1.id, p2.id] })
    const lag2 = await lagGroupRepository.create(sw.id, { name: 'lag2', port_ids: [p3.id, p4.id] })
    await expect(lagGroupRepository.update(lag2.id, { name: 'lag1' })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects an update when a selected port belongs to another LAG', async () => {
    const sw = await seedSwitch(prisma)
    const p = await port(sw.id); const p2 = await port(sw.id); const q = await port(sw.id)
    await lagGroupRepository.create(sw.id, { name: 'lag1', port_ids: [p.id, p2.id] })
    const other = await lagGroupRepository.create(sw.id, { name: 'lag2', port_ids: [q.id, p2.id] }).catch(() => null)
    expect(other).toBeNull()
    const other2 = await lagGroupRepository.create(sw.id, { name: 'lag2', port_ids: [q.id, await port(sw.id).then(x => x.id)] })
    await expect(lagGroupRepository.update(other2.id, { port_ids: [p.id, p2.id] }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it("accepts an update retaining that LAG's current members", async () => {
    const sw = await seedSwitch(prisma)
    const p = await port(sw.id); const p2 = await port(sw.id)
    const lag = await lagGroupRepository.create(sw.id, { name: 'lag1', port_ids: [p.id, p2.id] })
    await expect(lagGroupRepository.update(lag.id, { port_ids: [p.id, p2.id] })).resolves.toMatchObject({ port_ids: [p.id, p2.id] })
  })

  it.each([[[]], [['p1']], [['p1', 'p1']]])('rejects invalid member sets', async (port_ids) => {
    const sw = await seedSwitch(prisma)
    await expect(lagGroupRepository.create(sw.id, { name: 'lag', port_ids })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects whitespace-only names', async () => {
    const sw = await seedSwitch(prisma); const p1 = await port(sw.id); const p2 = await port(sw.id)
    await expect(lagGroupRepository.create(sw.id, { name: '  ', port_ids: [p1.id, p2.id] })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('does not delete a mirror when a local member has the wrong switch owner', async () => {
    const localSwitch = await seedSwitch(prisma)
    const remoteSwitch = await seedSwitch(prisma)
    const wrongSwitch = await seedSwitch(prisma)
    const localPorts = [await port(localSwitch.id), await port(localSwitch.id)]
    const remotePorts = [await port(remoteSwitch.id), await port(remoteSwitch.id)]
    const localLag = await lagGroupRepository.create(localSwitch.id, {
      name: 'local', port_ids: localPorts.map(p => p.id), remote_device_id: remoteSwitch.id
    })
    const remoteLag = await lagGroupRepository.create(remoteSwitch.id, {
      name: 'remote', port_ids: remotePorts.map(p => p.id), remote_device_id: localSwitch.id
    })

    await prisma.port.update({ where: { id: localPorts[0]!.id }, data: {
      connected_port_id: remotePorts[0]!.id, connected_device_id: remoteSwitch.id,
      connected_port: 'remote-1', connected_device: 'remote'
    } })
    await prisma.port.update({ where: { id: remotePorts[0]!.id }, data: {
      connected_port_id: localPorts[0]!.id, connected_device_id: localSwitch.id,
      connected_port: 'local-1', connected_device: 'local'
    } })
    await prisma.port.update({ where: { id: localPorts[1]!.id }, data: {
      connected_port_id: remotePorts[1]!.id, connected_device_id: remoteSwitch.id,
      connected_port: 'remote-2', connected_device: 'remote'
    } })
    await prisma.port.update({ where: { id: remotePorts[1]!.id }, data: {
      connected_port_id: localPorts[1]!.id, connected_device_id: localSwitch.id,
      connected_port: 'local-2', connected_device: 'local'
    } })
    await prisma.port.update({ where: { id: localPorts[0]!.id }, data: { switch_id: wrongSwitch.id } })

    const before = await Promise.all([
      prisma.lagGroup.findMany({ orderBy: { id: 'asc' } }),
      prisma.port.findMany({ orderBy: { id: 'asc' } })
    ])
    await expect(lagGroupRepository.delete(localLag.id, { delete_remote: true }))
      .rejects.toMatchObject({ statusCode: 409, message: 'Remote mirror cannot be uniquely and safely identified; nothing was deleted' })
    const after = await Promise.all([
      prisma.lagGroup.findMany({ orderBy: { id: 'asc' } }),
      prisma.port.findMany({ orderBy: { id: 'asc' } })
    ])
    expect(after).toEqual(before)
    expect(remoteLag.id).toBeTruthy()
  })

  it('atomically updates a strictly coupled mirror, links, and VLANs', async () => {
    const localSwitch = await seedSwitch(prisma)
    const remoteSwitch = await seedSwitch(prisma)
    const sites = await prisma.switch.findMany({ where: { id: { in: [localSwitch.id, remoteSwitch.id] } }, select: { site_id: true } })
    for (const { site_id } of sites) {
      for (const vlan_id of [10, 20]) await prisma.vlan.create({ data: { id: randomUUID(), site_id, vlan_id, name: `VLAN ${vlan_id}`, status: 'active', color: '#000000', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } })
    }
    const localPorts = [await port(localSwitch.id), await port(localSwitch.id)]
    const remotePorts = [await port(remoteSwitch.id), await port(remoteSwitch.id)]
    const localLag = await lagGroupRepository.create(localSwitch.id, { name: 'local', port_ids: localPorts.map(p => p.id), remote_device_id: remoteSwitch.id })
    const remoteLag = await lagGroupRepository.create(remoteSwitch.id, { name: 'remote', port_ids: remotePorts.map(p => p.id), remote_device_id: localSwitch.id })
    for (let i = 0; i < 2; i++) {
      await prisma.port.update({ where: { id: localPorts[i]!.id }, data: { connected_port_id: remotePorts[i]!.id, connected_device_id: remoteSwitch.id } })
      await prisma.port.update({ where: { id: remotePorts[i]!.id }, data: { connected_port_id: localPorts[i]!.id, connected_device_id: localSwitch.id } })
    }
    await lagGroupRepository.update(localLag.id, {
      name: 'renamed', port_ids: localPorts.map(p => p.id),
      sync: { remote_switch_id: remoteSwitch.id, mappings: localPorts.map((p, i) => ({ local_port_id: p.id, remote_port_id: remotePorts[i]!.id })), port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [20]
      }
    } as unknown as never)
    expect((await prisma.lagGroup.findUnique({ where: { id: localLag.id } }))?.name).toBe('renamed')
    expect((await prisma.lagGroup.findUnique({ where: { id: remoteLag.id } }))?.name).toBe('renamed')
    expect((await prisma.port.findUnique({ where: { id: remotePorts[0]!.id } }))?.native_vlan).toBe(10)
    expect((await prisma.switch.findUnique({ where: { id: remoteSwitch.id } }))?.configured_vlans).toBe('[10,20]')
  })

  it('rejects a damaged mirror without mutation', async () => {
    const localSwitch = await seedSwitch(prisma); const remoteSwitch = await seedSwitch(prisma)
    const lp = [await port(localSwitch.id), await port(localSwitch.id)]; const rp = [await port(remoteSwitch.id), await port(remoteSwitch.id)]
    const lag = await lagGroupRepository.create(localSwitch.id, { name: 'local', port_ids: lp.map(p => p.id), remote_device_id: remoteSwitch.id })
    await lagGroupRepository.create(remoteSwitch.id, { name: 'remote', port_ids: rp.map(p => p.id), remote_device_id: localSwitch.id })
    const before = await Promise.all([prisma.lagGroup.findMany({ orderBy: { id: 'asc' } }), prisma.port.findMany({ orderBy: { id: 'asc' } })])
    await expect(lagGroupRepository.update(lag.id, { sync: { remote_switch_id: remoteSwitch.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })), port_mode: 'access', access_vlan: 1, native_vlan: null, tagged_vlans: [] } } as unknown as never)).rejects.toMatchObject({ statusCode: 409 })
    expect(await Promise.all([prisma.lagGroup.findMany({ orderBy: { id: 'asc' } }), prisma.port.findMany({ orderBy: { id: 'asc' } })])).toEqual(before)
  })

  async function vlanSites(...switches: { id: string }[]) {
    const rows = await prisma.switch.findMany({ where: { id: { in: switches.map(s => s.id) } }, select: { site_id: true } })
    for (const { site_id } of rows) for (const vlan_id of [10, 20, 30]) {
      await prisma.vlan.create({ data: { id: randomUUID(), site_id, vlan_id, name: `VLAN ${vlan_id}`, status: 'active', color: '#000000', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } })
    }
  }

  async function snapshot() {
    return Promise.all([
      prisma.switch.findMany({ orderBy: { id: 'asc' } }),
      prisma.lagGroup.findMany({ orderBy: { id: 'asc' } }),
      prisma.port.findMany({ orderBy: { id: 'asc' } })
    ])
  }

  it('creates a mirror and synchronizes memberships, reciprocal links, VLANs and additive switch configuration', async () => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma); await vlanSites(local, remote)
    const lp = [await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id)]
    await prisma.switch.update({ where: { id: local.id }, data: { configured_vlans: '[30]' } })
    await prisma.switch.update({ where: { id: remote.id }, data: { configured_vlans: '[20]' } })
    const lag = await lagGroupRepository.create(local.id, { name: 'local', port_ids: lp.map(p => p.id), remote_device_id: remote.id })
    await lagGroupRepository.update(lag.id, { sync: { remote_switch_id: remote.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })), port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [20] } } as unknown as never)
    const mirrors = await prisma.lagGroup.findMany({ where: { switch_id: remote.id } }); expect(mirrors).toHaveLength(1)
    const remoteLag = mirrors[0]!
    expect(await prisma.port.findMany({ where: { id: { in: lp.map(p => p.id) } }, select: { lag_group_id: true, port_mode: true, native_vlan: true, tagged_vlans: true } })).toEqual(expect.arrayContaining(lp.map(() => ({ lag_group_id: lag.id, port_mode: 'trunk', native_vlan: 10, tagged_vlans: '[20]' }))))
    for (let i = 0; i < 2; i++) {
      expect(await prisma.port.findUnique({ where: { id: lp[i]!.id }, select: { connected_port_id: true, connected_device_id: true } })).toEqual({ connected_port_id: rp[i]!.id, connected_device_id: remote.id })
      expect(await prisma.port.findUnique({ where: { id: rp[i]!.id }, select: { connected_port_id: true, connected_device_id: true } })).toEqual({ connected_port_id: lp[i]!.id, connected_device_id: local.id })
    }
    expect((await prisma.switch.findUnique({ where: { id: local.id } }))?.configured_vlans).toBe('[10,20,30]')
    expect((await prisma.switch.findUnique({ where: { id: remote.id } }))?.configured_vlans).toBe('[10,20]')
    expect((await prisma.port.findMany({ where: { lag_group_id: remoteLag.id } })).map(p => p.id).sort()).toEqual(rp.map(p => p.id).sort())
  })

  it('rejects a strict mirror with a damaged historical extra candidate without mutation', async () => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma); await vlanSites(local, remote)
    const lp = [await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id)]
    const lag = await lagGroupRepository.create(local.id, { name: 'local', port_ids: lp.map(p => p.id), remote_device_id: remote.id })
    const good = await lagGroupRepository.create(remote.id, { name: 'good', port_ids: rp.map(p => p.id), remote_device_id: local.id })
    await prisma.port.updateMany({ where: { id: { in: [lp[0]!.id, rp[0]!.id] } }, data: { connected_port_id: rp[0]!.id, connected_device_id: remote.id } })
    await prisma.port.update({ where: { id: rp[0]!.id }, data: { connected_port_id: lp[0]!.id, connected_device_id: local.id } })
    await prisma.port.updateMany({ where: { id: { in: [lp[1]!.id, rp[1]!.id] } }, data: { connected_port_id: rp[1]!.id, connected_device_id: remote.id } })
    await prisma.port.update({ where: { id: rp[1]!.id }, data: { connected_port_id: lp[1]!.id, connected_device_id: local.id } })
    await lagGroupRepository.create(remote.id, { name: 'damaged', port_ids: [await port(remote.id).then(p => p.id), await port(remote.id).then(p => p.id)], remote_device_id: local.id })
    const before = await snapshot()
    await expect(lagGroupRepository.update(lag.id, { sync: { remote_switch_id: remote.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })), port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [20] } } as unknown as never)).rejects.toMatchObject({ statusCode: 409 })
    expect(await snapshot()).toEqual(before); expect(good.id).toBeTruthy()
  })

  it('rejects a physically connected new target port without mutation', async () => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma); await vlanSites(local, remote)
    const lp = [await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id)]; const external = await port((await seedSwitch(prisma)).id)
    const lag = await lagGroupRepository.create(local.id, { name: 'local', port_ids: lp.map(p => p.id), remote_device_id: remote.id })
    await prisma.port.update({ where: { id: rp[0]!.id }, data: { connected_port_id: external.id, connected_device_id: (await prisma.port.findUnique({ where: { id: external.id }, select: { switch_id: true } }))!.switch_id } })
    const before = await snapshot()
    await expect(lagGroupRepository.update(lag.id, { sync: { remote_switch_id: remote.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })), port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [20] } } as unknown as never)).rejects.toMatchObject({ statusCode: 409 })
    expect(await snapshot()).toEqual(before)
  })

  it('synchronizes a second time with changed pairs and membership', async () => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma); await vlanSites(local, remote)
    const lp = [await port(local.id), await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id), await port(remote.id)]
    const lag = await lagGroupRepository.create(local.id, { name: 'local', port_ids: lp.map(p => p.id), remote_device_id: remote.id })
    const pairs = (left: typeof lp, right: typeof rp) => left.map((p, i) => ({ local_port_id: p.id, remote_port_id: right[i]!.id }))
    await lagGroupRepository.update(lag.id, { sync: { remote_switch_id: remote.id, mappings: pairs(lp, rp), port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [20] } } as unknown as never)
    const newLp = [lp[0]!, lp[2]!]; const newRp = [rp[1]!, rp[2]!]
    await lagGroupRepository.update(lag.id, { port_ids: newLp.map(p => p.id), sync: { remote_switch_id: remote.id, mappings: pairs(newLp, newRp), port_mode: 'access', access_vlan: 30, native_vlan: null, tagged_vlans: [] } } as unknown as never)
    expect(await prisma.port.findUnique({ where: { id: rp[0]!.id }, select: { lag_group_id: true, connected_port_id: true, connected_device_id: true } })).toEqual({ lag_group_id: null, connected_port_id: null, connected_device_id: null })
    expect(await prisma.port.findUnique({ where: { id: lp[1]!.id }, select: { lag_group_id: true, connected_port_id: true, connected_device_id: true } })).toEqual({ lag_group_id: null, connected_port_id: null, connected_device_id: null })
    const remoteLag = (await prisma.lagGroup.findMany({ where: { switch_id: remote.id } }))[0]!
    expect((await prisma.port.findMany({ where: { lag_group_id: remoteLag.id } })).map(p => p.id).sort()).toEqual(newRp.map(p => p.id).sort())
    for (const [i, p] of newLp.entries()) {
      expect(await prisma.port.findUnique({ where: { id: p.id }, select: { connected_port_id: true, connected_device_id: true, port_mode: true, access_vlan: true, native_vlan: true, tagged_vlans: true } })).toEqual({ connected_port_id: newRp[i]!.id, connected_device_id: remote.id, port_mode: 'access', access_vlan: 30, native_vlan: null, tagged_vlans: '[]' })
      expect(await prisma.port.findUnique({ where: { id: newRp[i]!.id }, select: { connected_port_id: true, connected_device_id: true, port_mode: true, access_vlan: true, native_vlan: true, tagged_vlans: true } })).toEqual({ connected_port_id: p.id, connected_device_id: local.id, port_mode: 'access', access_vlan: 30, native_vlan: null, tagged_vlans: '[]' })
    }
    expect((await prisma.switch.findUnique({ where: { id: local.id } }))?.configured_vlans).toBe('[10,20,30]')
    expect((await prisma.switch.findUnique({ where: { id: remote.id } }))?.configured_vlans).toBe('[10,20,30]')
  })

  it('creates a remote mirror atomically from a create sync payload', async () => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma); await vlanSites(local, remote)
    const lp = [await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id)]
    const lag = await lagGroupRepository.create(local.id, { name: 'created', port_ids: lp.map(p => p.id), remote_device_id: remote.id, sync: { remote_switch_id: remote.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })), port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [20] } } as unknown as never)
    const mirror = (await prisma.lagGroup.findMany({ where: { switch_id: remote.id } }))[0]!
    expect(mirror).toBeTruthy()
    expect((await prisma.port.findMany({ where: { lag_group_id: mirror.id } })).map(p => p.id).sort()).toEqual(rp.map(p => p.id).sort())
    expect(await prisma.port.findUnique({ where: { id: rp[0]!.id }, select: { connected_port_id: true, connected_device_id: true, port_mode: true, native_vlan: true, tagged_vlans: true } })).toEqual({ connected_port_id: lp[0]!.id, connected_device_id: local.id, port_mode: 'trunk', native_vlan: 10, tagged_vlans: '[20]' })
    expect(lag.id).toBeTruthy()
  })

  it('rejects create sync when a remote target is already externally connected without mutation', async () => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma); const external = await seedSwitch(prisma)
    const lp = [await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id)]; const ep = await port(external.id)
    await prisma.port.update({ where: { id: rp[0]!.id }, data: { connected_port_id: ep.id, connected_device_id: external.id } })
    const before = await snapshot()
    await expect(lagGroupRepository.create(local.id, { name: 'local', port_ids: lp.map(p => p.id), remote_device_id: remote.id, sync: { remote_switch_id: remote.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })), port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [] } } as unknown as never)).rejects.toMatchObject({ statusCode: 409 })
    expect(await snapshot()).toEqual(before)
  })

  it('rejects update sync to another remote switch for an already remote-bound LAG without mutation', async () => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma); const other = await seedSwitch(prisma)
    const lp = [await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id)]; const op = [await port(other.id), await port(other.id)]
    const lag = await lagGroupRepository.create(local.id, { name: 'local', port_ids: lp.map(p => p.id), remote_device_id: remote.id })
    await lagGroupRepository.update(lag.id, { sync: { remote_switch_id: remote.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })), port_mode: 'access', access_vlan: null, native_vlan: null, tagged_vlans: [] } } as unknown as never)
    const before = await snapshot()
    await expect(lagGroupRepository.update(lag.id, { sync: { remote_switch_id: other.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: op[i]!.id })), port_mode: 'access', access_vlan: null, native_vlan: null, tagged_vlans: [] } } as unknown as never)).rejects.toMatchObject({ statusCode: 409 })
    expect(await snapshot()).toEqual(before)
  })

  it.each([
    (lp: { id: string }[], rp: { id: string }[]) => lp.slice(0, 1).map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })),
    (lp: { id: string }[], rp: { id: string }[]) => [{ local_port_id: randomUUID(), remote_port_id: rp[0]!.id }, { local_port_id: lp[1]!.id, remote_port_id: rp[1]!.id }]
  ])('rejects sync mappings that do not exactly cover local LAG members without mutation', async (mapping) => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma)
    const lp = [await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id)]
    const lag = await lagGroupRepository.create(local.id, { name: 'local', port_ids: lp.map(p => p.id), remote_device_id: remote.id })
    const before = await snapshot()
    await expect(lagGroupRepository.update(lag.id, { sync: { remote_switch_id: remote.id, mappings: mapping(lp, rp), port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [] } } as unknown as never)).rejects.toMatchObject({ statusCode: 409 })
    expect(await snapshot()).toEqual(before)
  })

  it('derives remote_device_id from sync and rejects mismatches without mutation', async () => {
    const local = await seedSwitch(prisma); const remote = await seedSwitch(prisma); const third = await seedSwitch(prisma); await vlanSites(local, remote, third)
    const lp = [await port(local.id), await port(local.id)]; const rp = [await port(remote.id), await port(remote.id)]
    const lag = await lagGroupRepository.create(local.id, { name: 'local', port_ids: lp.map(p => p.id) })
    const sync = { remote_switch_id: remote.id, mappings: lp.map((p, i) => ({ local_port_id: p.id, remote_port_id: rp[i]!.id })), port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [20] }
    await lagGroupRepository.update(lag.id, { sync } as unknown as never)
    const before = await snapshot()
    await expect(lagGroupRepository.update(lag.id, { remote_device_id: third.id, sync } as unknown as never)).rejects.toMatchObject({ statusCode: 409 })
    expect(await snapshot()).toEqual(before)
    expect((await prisma.lagGroup.findUnique({ where: { id: lag.id } }))?.remote_device_id).toBe(remote.id)
  })
})
