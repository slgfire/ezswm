import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSwitch } from './testHelpers'
import { lagGroupRepository } from '../server/repositories/lagGroupRepository'

const portState = (prisma: PrismaClient, ids: string[]) => prisma.port.findMany({
  where: { id: { in: ids } },
  orderBy: { id: 'asc' },
  select: {
     id: true, switch_id: true, lag_group_id: true, port_mode: true, access_vlan: true, native_vlan: true, tagged_vlans: true,
     label: true, type: true, speed: true, status: true, description: true, mac_address: true,
     connected_allocation_id: true, poe: true, helper_usage: true, helper_label: true, show_in_helper_list: true,
    connected_device: true, connected_device_id: true, connected_port_id: true, connected_port: true
  }
})

const lagState = (prisma: PrismaClient) => prisma.lagGroup.findMany({ orderBy: { id: 'asc' } })

describe('lagGroupRepository.delete', () => {
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

  beforeEach(async () => {
    await resetDb()
  })

  it('clears the inter-switch links on both ends when the LAG is deleted', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' })
    const s2 = await seedSwitch(prisma, { name: 'S2' })

    const portB = await prisma.port.create({
      data: { id: randomUUID(), switch_id: s2.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' }
    })
    const portA = await prisma.port.create({
      data: {
        id: randomUUID(), switch_id: s1.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]',
        connected_device: 'S2', connected_device_id: s2.id, connected_port_id: portB.id, connected_port: 'B'
      }
    })
    const portA2 = await prisma.port.create({
      data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 2, type: 'rj45', status: 'up', tagged_vlans: '[]' }
    })
    await prisma.port.update({
      where: { id: portB.id },
      data: { connected_device: 'S1', connected_device_id: s1.id, connected_port_id: portA.id, connected_port: 'A' }
    })

    const lag = await lagGroupRepository.create(s1.id, {
      name: 'lag1', port_ids: [portA.id, portA2.id], remote_device: 'S2', remote_device_id: s2.id
    })

    const ok = await lagGroupRepository.delete(lag.id)
    expect(ok).toBe(true)

    const a = await prisma.port.findUnique({ where: { id: portA.id } })
    const b = await prisma.port.findUnique({ where: { id: portB.id } })

    // Member port: link gone + detached from LAG
    expect(a?.connected_device_id).toBeNull()
    expect(a?.connected_port_id).toBeNull()
    expect(a?.connected_device).toBeNull()
    expect(a?.connected_port).toBeNull()
    expect(a?.lag_group_id).toBeNull()
    const a2 = await prisma.port.findUnique({ where: { id: portA2.id } })
    expect(a2?.lag_group_id).toBeNull()

    // Peer port: link gone
    expect(b?.connected_device_id).toBeNull()
    expect(b?.connected_port_id).toBeNull()
    expect(b?.connected_device).toBeNull()
    expect(b?.connected_port).toBeNull()
  })

  it('deletes a LAG without connections without error', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' })
    const portA = await prisma.port.create({
      data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' }
    })
    const portA2 = await prisma.port.create({
      data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 2, type: 'rj45', status: 'up', tagged_vlans: '[]' }
    })
    const lag = await lagGroupRepository.create(s1.id, { name: 'lag1', port_ids: [portA.id, portA2.id] })
    expect(await lagGroupRepository.delete(lag.id)).toBe(true)
    const a = await prisma.port.findUnique({ where: { id: portA.id } })
    expect(a?.lag_group_id).toBeNull()
  })

  it('keeps and detaches a remote mirror for local-only deletion', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' })
    const s2 = await seedSwitch(prisma, { name: 'S2' })
     const a = await prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 1, type: 'rj45', status: 'up', port_mode: 'access', access_vlan: 10, native_vlan: 10, tagged_vlans: '[10]', description: 'local-a' } })
     const a2 = await prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 2, type: 'rj45', status: 'up', port_mode: 'trunk', native_vlan: 20, tagged_vlans: '[20,30]', description: 'local-a2' } })
      const b = await prisma.port.create({ data: { id: randomUUID(), switch_id: s2.id, unit: 1, index: 1, type: 'rj45', status: 'up', port_mode: 'trunk', native_vlan: 40, tagged_vlans: '[20]', description: 'remote-b', speed: '1000', helper_usage: 'dhcp', helper_label: 'relay', show_in_helper_list: true } })
      const b2 = await prisma.port.create({ data: { id: randomUUID(), switch_id: s2.id, unit: 1, index: 2, type: 'rj45', status: 'up', port_mode: 'access', access_vlan: 50, tagged_vlans: '[]', description: 'remote-b2', speed: '100', helper_usage: 'dns', helper_label: 'resolver', show_in_helper_list: false } })
    const remote = await lagGroupRepository.create(s2.id, { name: 'lag1', port_ids: [b.id, b2.id], remote_device: s1.name, remote_device_id: s1.id })
    const local = await lagGroupRepository.create(s1.id, { name: 'lag1', port_ids: [a.id, a2.id], remote_device: s2.name, remote_device_id: s2.id })
    await prisma.port.update({ where: { id: a.id }, data: { connected_device: s2.name, connected_device_id: s2.id, connected_port_id: b.id, connected_port: 'B' } })
     await prisma.port.update({ where: { id: b.id }, data: { connected_device: s1.name, connected_device_id: s1.id, connected_port_id: a.id, connected_port: 'A' } })
     await prisma.port.update({ where: { id: b2.id }, data: { connected_device: s1.name, connected_device_id: s1.id, connected_port_id: a2.id, connected_port: 'A2' } })
     await prisma.port.update({ where: { id: a2.id }, data: { connected_device: s2.name, connected_device_id: s2.id, connected_port_id: b2.id, connected_port: 'B2' } })
      const beforeLags = await lagState(prisma)
      const beforePorts = await portState(prisma, [a.id, a2.id, b.id, b2.id])
      const beforeRemotePorts = await prisma.port.findMany({ where: { id: { in: [b.id, b2.id] } }, orderBy: { id: 'asc' } })
     expect(await lagGroupRepository.delete(local.id)).toBe(true)
     expect(await lagState(prisma)).toEqual(beforeLags.filter(row => row.id !== local.id).map(row => row.id === remote.id ? { ...row, remote_device: null, remote_device_id: null } : row))
     expect(await prisma.lagGroup.findUnique({ where: { id: remote.id } })).toMatchObject({ remote_device_id: null })
     expect(await prisma.lagGroup.findUnique({ where: { id: local.id } })).toBeNull()
     for (const id of [a.id, a2.id, b.id, b2.id]) {
      expect((await portState(prisma, [id]))[0]).toMatchObject({
        connected_port_id: null, connected_device_id: null, connected_device: null, connected_port: null
      })
     }
     for (const id of [a.id, a2.id]) {
       const before = beforePorts.find(port => port.id === id)
       expect(await portState(prisma, [id])).toEqual([expect.objectContaining({ ...before, lag_group_id: null, connected_port_id: null, connected_device_id: null, connected_device: null, connected_port: null })])
     }
      expect(await portState(prisma, [b.id])).toEqual([expect.objectContaining({ id: b.id, lag_group_id: remote.id, port_mode: 'trunk', native_vlan: 40, tagged_vlans: '[20]' })])
      expect(await portState(prisma, [b2.id])).toEqual([expect.objectContaining({ id: b2.id, lag_group_id: remote.id, port_mode: 'access', access_vlan: 50, tagged_vlans: '[]' })])
      expect(await prisma.port.findMany({ where: { id: { in: [b.id, b2.id] } }, orderBy: { id: 'asc' } })).toEqual(beforeRemotePorts.map(port => ({
        ...port,
        connected_device: null,
        connected_device_id: null,
        connected_port_id: null,
        connected_port: null
      })))
  })

  it('deletes both coupled mirrors with delete_remote', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' }); const s2 = await seedSwitch(prisma, { name: 'S2' })
    const ports = await Promise.all([1, 2, 3, 4].map((index) => prisma.port.create({ data: { id: randomUUID(), switch_id: index < 3 ? s1.id : s2.id, unit: 1, index, type: 'rj45', status: 'up', tagged_vlans: '[]' } })))
    const remote = await lagGroupRepository.create(s2.id, { name: 'r', port_ids: [ports[2]!.id, ports[3]!.id], remote_device_id: s1.id })
    const local = await lagGroupRepository.create(s1.id, { name: 'l', port_ids: [ports[0]!.id, ports[1]!.id], remote_device_id: s2.id })
    await prisma.port.update({ where: { id: ports[0]!.id }, data: { connected_port_id: ports[2]!.id, connected_device_id: s2.id } }); await prisma.port.update({ where: { id: ports[2]!.id }, data: { connected_port_id: ports[0]!.id, connected_device_id: s1.id } })
    await prisma.port.update({ where: { id: ports[1]!.id }, data: { connected_port_id: ports[3]!.id, connected_device_id: s2.id } }); await prisma.port.update({ where: { id: ports[3]!.id }, data: { connected_port_id: ports[1]!.id, connected_device_id: s1.id } })
     expect(await lagGroupRepository.delete(local.id, { delete_remote: true })).toBe(true)
     expect(await prisma.lagGroup.findMany()).toHaveLength(0)
     for (const port of ports) {
       expect(await prisma.port.findUnique({ where: { id: port.id } })).toMatchObject({
         lag_group_id: null,
         connected_device: null,
         connected_device_id: null,
         connected_port_id: null,
         connected_port: null
       })
     }
  })

  it('rejects remote deletion when no coupled mirror exists', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' }); const s2 = await seedSwitch(prisma, { name: 'S2' })
    const ports = await Promise.all([1, 2].map(index => prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index, type: 'rj45', status: 'up', tagged_vlans: '[]' } })))
    const local = await lagGroupRepository.create(s1.id, { name: 'l', port_ids: ports.map(p => p.id), remote_device_id: s2.id })
    const beforeLags = await lagState(prisma)
    const beforePorts = await portState(prisma, ports.map(p => p.id))
    await expect(lagGroupRepository.delete(local.id, { delete_remote: true })).rejects.toMatchObject({ statusCode: 409 })
    expect(await lagState(prisma)).toEqual(beforeLags)
    expect(await portState(prisma, ports.map(p => p.id))).toEqual(beforePorts)
  })

  it('local-only deletion preserves an unconnected remote LAG reference', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' }); const s2 = await seedSwitch(prisma, { name: 'S2' })
    const localPorts = await Promise.all([1, 2].map(index => prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index, type: 'rj45', status: 'up', tagged_vlans: '[]' } })))
    const remotePorts = await Promise.all([1, 2].map(index => prisma.port.create({ data: { id: randomUUID(), switch_id: s2.id, unit: 1, index, type: 'rj45', status: 'up', tagged_vlans: '[]' } })))
    const remote = await lagGroupRepository.create(s2.id, { name: 'remote', port_ids: remotePorts.map(p => p.id), remote_device_id: s1.id, remote_device: s1.name })
    const local = await lagGroupRepository.create(s1.id, { name: 'local', port_ids: localPorts.map(p => p.id), remote_device_id: s2.id })
    await lagGroupRepository.delete(local.id)
    expect(await prisma.lagGroup.findUnique({ where: { id: remote.id } })).toMatchObject({ remote_device_id: s1.id })
  })

  it('rejects a reciprocal port pair owned by the wrong switches without mutation', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' }); const s2 = await seedSwitch(prisma, { name: 'S2' }); const other = await seedSwitch(prisma, { name: 'Other' })
    const a = await prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[1]' } })
    const a2 = await prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 2, type: 'rj45', status: 'up', tagged_vlans: '[2]' } })
    const b = await prisma.port.create({ data: { id: randomUUID(), switch_id: other.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[3]' } })
    const remote = await lagGroupRepository.create(s2.id, { name: 'remote', port_ids: [(await prisma.port.create({ data: { id: randomUUID(), switch_id: s2.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' } })).id, (await prisma.port.create({ data: { id: randomUUID(), switch_id: s2.id, unit: 1, index: 2, type: 'rj45', status: 'up', tagged_vlans: '[]' } })).id], remote_device_id: s1.id })
    const local = await lagGroupRepository.create(s1.id, { name: 'local', port_ids: [a.id, a2.id], remote_device_id: s2.id })
    await prisma.port.update({ where: { id: a.id }, data: { connected_port_id: b.id, connected_device_id: s2.id } })
    await prisma.port.update({ where: { id: b.id }, data: { connected_port_id: a.id, connected_device_id: s1.id } })
    const involved = [a.id, a2.id, b.id, ...(await prisma.port.findMany({ where: { switch_id: s2.id }, select: { id: true } })).map(p => p.id)]
    const beforeLags = await lagState(prisma)
     const beforePorts = await portState(prisma, involved)
    await expect(lagGroupRepository.delete(local.id, { delete_remote: true })).rejects.toMatchObject({ statusCode: 409 })
    expect(await lagState(prisma)).toEqual(beforeLags)
    expect(await portState(prisma, involved)).toEqual(beforePorts)
  })

   it('rejects a damaged non-reciprocal mirror and leaves every record untouched', async () => {
     const s1 = await seedSwitch(prisma, { name: 'S1' }); const s2 = await seedSwitch(prisma, { name: 'S2' })
     const localPorts = await Promise.all([1, 2].map(index => prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index, type: 'rj45', status: 'up', tagged_vlans: '[]' } })))
     const remotePorts = await Promise.all([1, 2].map(index => prisma.port.create({ data: { id: randomUUID(), switch_id: s2.id, unit: 1, index, type: 'rj45', status: 'up', tagged_vlans: '[]' } })))
     const remote = await lagGroupRepository.create(s2.id, { name: 'remote', port_ids: remotePorts.map(p => p.id), remote_device_id: s1.id })
     const local = await lagGroupRepository.create(s1.id, { name: 'local', port_ids: localPorts.map(p => p.id), remote_device_id: s2.id })
     await prisma.port.update({ where: { id: localPorts[0]!.id }, data: { connected_port_id: remotePorts[0]!.id, connected_device_id: s2.id } })
     await prisma.port.update({ where: { id: remotePorts[0]!.id }, data: { connected_port_id: localPorts[0]!.id, connected_device_id: s1.id } })
     // The second link is damaged: it only points from local to remote.
     await prisma.port.update({ where: { id: localPorts[1]!.id }, data: { connected_port_id: remotePorts[1]!.id, connected_device_id: s2.id } })
     const involved = [...localPorts, ...remotePorts].map(p => p.id)
     const beforeLags = await lagState(prisma)
     const beforePorts = await portState(prisma, involved)
     await expect(lagGroupRepository.delete(local.id, { delete_remote: true })).rejects.toMatchObject({ statusCode: 409, message: 'Remote mirror cannot be uniquely and safely identified; nothing was deleted' })
     expect(await lagState(prisma)).toEqual(beforeLags)
     expect(await portState(prisma, involved)).toEqual(beforePorts)
     expect(await prisma.lagGroup.findUnique({ where: { id: remote.id } })).not.toBeNull()
    })

   it('preserves one-sided links during local-only deletion', async () => {
     const s1 = await seedSwitch(prisma, { name: 'S1' }); const s2 = await seedSwitch(prisma, { name: 'S2' })
     const localPorts = await Promise.all([1, 2].map(index => prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index, type: 'rj45', status: 'up', tagged_vlans: '[]' } })))
     const peer = await prisma.port.create({ data: { id: randomUUID(), switch_id: s2.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' } })
     const local = await lagGroupRepository.create(s1.id, { name: 'local', port_ids: localPorts.map(p => p.id) })
     await prisma.port.update({ where: { id: localPorts[0]!.id }, data: { connected_port_id: peer.id, connected_device_id: s2.id } })
     const before = await portState(prisma, [localPorts[0]!.id, peer.id])
     await lagGroupRepository.delete(local.id)
     expect(await portState(prisma, [localPorts[0]!.id, peer.id])).toEqual(before.map(port =>
       port.id === localPorts[0]!.id ? { ...port, lag_group_id: null } : port
     ))
   })

  it('preserves member port configuration when deleting both coupled mirrors', async () => {
    const s1 = await seedSwitch(prisma, { name: 'S1' })
    const s2 = await seedSwitch(prisma, { name: 'S2' })
    const localPorts = await Promise.all([
      prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 1, type: 'rj45', status: 'up', port_mode: 'access', access_vlan: 10, native_vlan: 10, tagged_vlans: '[10,20]', speed: '1000', description: 'local member one', helper_usage: 'dhcp', helper_label: 'local-relay', show_in_helper_list: true } }),
      prisma.port.create({ data: { id: randomUUID(), switch_id: s1.id, unit: 1, index: 2, type: 'sfp', status: 'down', port_mode: 'trunk', native_vlan: 30, tagged_vlans: '[40,50]', speed: '10000', description: 'local member two', helper_usage: 'dns', helper_label: 'local-dns', show_in_helper_list: false } })
    ])
    const remotePorts = await Promise.all([
      prisma.port.create({ data: { id: randomUUID(), switch_id: s2.id, unit: 1, index: 1, type: 'rj45', status: 'up', port_mode: 'trunk', native_vlan: 60, tagged_vlans: '[70]', speed: '2500', description: 'remote member one', helper_usage: 'ntp', helper_label: 'remote-time', show_in_helper_list: true } }),
      prisma.port.create({ data: { id: randomUUID(), switch_id: s2.id, unit: 1, index: 2, type: 'sfp', status: 'up', port_mode: 'access', access_vlan: 80, tagged_vlans: '[]', speed: '10000', description: 'remote member two', helper_usage: 'syslog', helper_label: 'remote-log', show_in_helper_list: false } })
    ])
    await lagGroupRepository.create(s2.id, { name: 'remote', port_ids: remotePorts.map(p => p.id), remote_device_id: s1.id })
    const local = await lagGroupRepository.create(s1.id, { name: 'local', port_ids: localPorts.map(p => p.id), remote_device_id: s2.id })
    for (let i = 0; i < localPorts.length; i++) {
      await prisma.port.update({ where: { id: localPorts[i]!.id }, data: { connected_device: s2.name, connected_device_id: s2.id, connected_port_id: remotePorts[i]!.id, connected_port: `remote-${i + 1}` } })
      await prisma.port.update({ where: { id: remotePorts[i]!.id }, data: { connected_device: s1.name, connected_device_id: s1.id, connected_port_id: localPorts[i]!.id, connected_port: `local-${i + 1}` } })
    }

    const ids = [...localPorts, ...remotePorts].map(port => port.id)
    const before = await portState(prisma, ids)
    expect(await lagGroupRepository.delete(local.id, { delete_remote: true })).toBe(true)

    const clearedLinks = { connected_device: null, connected_device_id: null, connected_port_id: null, connected_port: null, lag_group_id: null }
    expect(await prisma.lagGroup.findMany()).toEqual([])
    expect(await portState(prisma, ids)).toEqual(before.map(port => ({ ...port, ...clearedLinks })))
  })
 })
