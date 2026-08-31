import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { switchRepository } from '../server/repositories/switchRepository'
import { layoutTemplateRepository } from '../server/repositories/layoutTemplateRepository'
import { lagGroupRepository } from '../server/repositories/lagGroupRepository'

describe('switch/port/LAG integrity regressions', () => {
  const id = () => globalThis.crypto.randomUUID()

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

  it('does not regenerate ports when stack_size is updated null↔1', async () => {
    const site = await seedSite(prisma)
    const template = await layoutTemplateRepository.create({
      name: 't1',
      units: [{ unit_number: 1, blocks: [{ id: '', type: 'rj45', count: 2, start_index: 1, rows: 1 }] }]
    })
    const sw = await switchRepository.create({ site_id: site.id, name: 'sw1', layout_template_id: template.id, tags: [], configured_vlans: [] })
    await switchRepository.updatePort(sw.id, sw.ports[0]!.id, { description: 'keep-me' })

    const updated = await switchRepository.update(sw.id, { stack_size: 1 })
    expect(updated.ports.map(port => port.id)).toEqual(sw.ports.map(port => port.id))
    expect(updated.ports[0]?.description).toBe('keep-me')
  })

  it('regenerates ports on real stack size change and clears peer links before delete', async () => {
    const site = await seedSite(prisma)
    const template = await layoutTemplateRepository.create({
      name: 't2',
      units: [{ unit_number: 1, blocks: [{ id: '', type: 'rj45', count: 1, start_index: 1, rows: 1 }] }]
    })
    const sw = await switchRepository.create({ site_id: site.id, name: 'sw2', layout_template_id: template.id, stack_size: 1, tags: [], configured_vlans: [] })
    const peerSwitch = await seedSwitch(prisma, { site_id: site.id })
    const peerPort = await prisma.port.create({
      data: {
        id: id(), switch_id: peerSwitch.id, unit: 1, index: 1, label: 'peer', type: 'rj45', status: 'up', tagged_vlans: '[]',
        connected_device_id: sw.id, connected_port_id: sw.ports[0]!.id, connected_device: sw.name, connected_port: sw.ports[0]!.label ?? null
      }
    })

    const updated = await switchRepository.update(sw.id, { stack_size: 2 })
    expect(updated.ports).toHaveLength(2)
    expect(updated.ports.some(port => port.id === sw.ports[0]!.id)).toBe(false)
    const peerAfter = await prisma.port.findUniqueOrThrow({ where: { id: peerPort.id } })
    expect(peerAfter.connected_port_id).toBeNull()
    expect(peerAfter.connected_device_id).toBeNull()
  })

  it('clears peer links before deleting unmatched ports during template sync', async () => {
    const site = await seedSite(prisma)
    const template = await layoutTemplateRepository.create({
      name: 't3',
      units: [{ unit_number: 1, blocks: [{ id: '', type: 'rj45', count: 2, start_index: 1, rows: 1 }] }]
    })
    const sw = await switchRepository.create({ site_id: site.id, name: 'sw3', layout_template_id: template.id, tags: [], configured_vlans: [] })
    const peerSwitch = await seedSwitch(prisma, { site_id: site.id })
    const peerPort = await prisma.port.create({
      data: {
        id: id(), switch_id: peerSwitch.id, unit: 1, index: 1, label: 'peer', type: 'rj45', status: 'up', tagged_vlans: '[]',
        connected_device_id: sw.id, connected_port_id: sw.ports[1]!.id, connected_device: sw.name, connected_port: sw.ports[1]!.label ?? null
      }
    })

    await layoutTemplateRepository.update(template.id, {
      units: [{ unit_number: 1, blocks: [{ id: '', type: 'rj45', count: 1, start_index: 1, rows: 1 }] }]
    })

    const peerAfter = await prisma.port.findUniqueOrThrow({ where: { id: peerPort.id } })
    expect(peerAfter.connected_port_id).toBeNull()
    expect(peerAfter.connected_device_id).toBeNull()
  })

  it('preserves shared port config when switching templates and only removes unmatched ports', async () => {
    const site = await seedSite(prisma)
    const twoPort = await layoutTemplateRepository.create({
      name: 'hotfix-old-2p',
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 1, start_index: 1, rows: 1, label: 'Gi1/0/' },
          { id: '', type: 'sfp', count: 1, start_index: 1, rows: 1, label: 'SFP1/' }
        ]
      }]
    })
    const fourPort = await layoutTemplateRepository.create({
      name: 'hotfix-new-4p',
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 1, label: 'Eth1/' }
        ]
      }]
    })

    const sw = await switchRepository.create({
      site_id: site.id,
      name: 'sw-hotfix',
      layout_template_id: twoPort.id,
      configured_vlans: [],
      tags: []
    })

    const sharedBefore = sw.ports.find(port => port.type === 'rj45' && port.unit === 1 && port.index === 1)
    const unmatchedBefore = sw.ports.find(port => port.type === 'sfp' && port.unit === 1 && port.index === 1)
    expect(sharedBefore).toBeDefined()
    expect(unmatchedBefore).toBeDefined()

    await switchRepository.updatePort(sw.id, sharedBefore!.id, {
      label: 'Custom Label',
      description: 'keep this description',
      status: 'up',
      speed: '1G',
      port_mode: 'trunk',
      native_vlan: 10,
      access_vlan: 20,
      tagged_vlans: [10, 20, 30],
      connected_device: 'uplink-core',
      connected_port: 'Eth9/1',
      mac_address: 'AA:BB:CC:DD:EE:FF',
      helper_usage: 'uplink',
      helper_label: 'Backbone',
      show_in_helper_list: false,
      poe: { type: '802.3at', max_watts: 30 }
    })

    const updated = await switchRepository.update(sw.id, { layout_template_id: fourPort.id })

    expect(updated.ports).toHaveLength(4)
    const sharedAfter = updated.ports.find(port => port.unit === 1 && port.index === 1 && port.type === 'rj45')
    expect(sharedAfter?.id).toBe(sharedBefore!.id)
    expect(sharedAfter).toMatchObject({
      label: 'Custom Label',
      description: 'keep this description',
      status: 'up',
      speed: '1G',
      port_mode: 'trunk',
      native_vlan: 10,
      access_vlan: 20,
      tagged_vlans: [10, 20, 30],
      connected_device: 'uplink-core',
      connected_port: 'Eth9/1',
      mac_address: 'AA:BB:CC:DD:EE:FF',
      helper_usage: 'uplink',
      helper_label: 'Backbone',
      show_in_helper_list: false,
      poe: { type: '802.3at', max_watts: 30 }
    })

    expect(updated.ports.some(port => port.id === unmatchedBefore!.id)).toBe(false)
    expect(updated.ports.some(port => port.type === 'sfp')).toBe(false)
    expect(updated.ports.filter(port => port.type === 'rj45').map(port => `${port.unit}/${port.index}`)).toEqual(['1/1', '1/2', '1/3', '1/4'])
  })

  it('cleans local LAG membership and decouples remote mirror when an unmatched template-switch port is deleted', async () => {
    const site = await seedSite(prisma)
    const oldTemplate = await layoutTemplateRepository.create({
      name: 'lag-cleanup-old',
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 1, start_index: 1, rows: 1 },
          { id: '', type: 'sfp', count: 1, start_index: 1, rows: 1 }
        ]
      }]
    })
    const newTemplate = await layoutTemplateRepository.create({
      name: 'lag-cleanup-new',
      units: [{ unit_number: 1, blocks: [{ id: '', type: 'rj45', count: 1, start_index: 1, rows: 1 }] }]
    })

    const sw = await switchRepository.create({
      site_id: site.id,
      name: 'sw-lag-cleanup',
      layout_template_id: oldTemplate.id,
      configured_vlans: [],
      tags: []
    })
    const localRj45 = sw.ports.find(port => port.type === 'rj45')!
    const localSfp = sw.ports.find(port => port.type === 'sfp')!

    const remote = await seedSwitch(prisma, { site_id: site.id, name: 'remote-lag-cleanup' })
    const remoteP1 = await prisma.port.create({ data: { id: id(), switch_id: remote.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' } })
    const remoteP2 = await prisma.port.create({ data: { id: id(), switch_id: remote.id, unit: 1, index: 2, type: 'sfp', status: 'up', tagged_vlans: '[]' } })

    const remoteLag = await lagGroupRepository.create(remote.id, {
      name: 'remote-lag',
      port_ids: [remoteP1.id, remoteP2.id],
      remote_device: 'sw-lag-cleanup',
      remote_device_id: sw.id
    })
    const localLag = await lagGroupRepository.create(sw.id, {
      name: 'local-lag',
      port_ids: [localRj45.id, localSfp.id],
      remote_device: 'remote-lag-cleanup',
      remote_device_id: remote.id
    })

    await prisma.port.update({
      where: { id: localSfp.id },
      data: { connected_device: 'remote-lag-cleanup', connected_device_id: remote.id, connected_port_id: remoteP2.id, connected_port: remoteP2.label }
    })
    await prisma.port.update({
      where: { id: remoteP2.id },
      data: { connected_device: sw.name, connected_device_id: sw.id, connected_port_id: localSfp.id, connected_port: localSfp.label }
    })

    const updated = await switchRepository.update(sw.id, { layout_template_id: newTemplate.id })

    expect(updated.ports.some(port => port.id === localSfp.id)).toBe(false)
    expect(await prisma.lagGroup.findUnique({ where: { id: localLag.id } })).toBeNull()
    const remoteLagAfter = await prisma.lagGroup.findUniqueOrThrow({ where: { id: remoteLag.id } })
    expect(remoteLagAfter.remote_device_id).toBeNull()
    expect(remoteLagAfter.remote_device).toBeNull()

    const localRj45After = await prisma.port.findUniqueOrThrow({ where: { id: localRj45.id } })
    const remoteP1After = await prisma.port.findUniqueOrThrow({ where: { id: remoteP1.id } })
    const remoteP2After = await prisma.port.findUniqueOrThrow({ where: { id: remoteP2.id } })

    expect(localRj45After.lag_group_id).toBeNull()
    expect(remoteP1After.lag_group_id).toBe(remoteLag.id)
    expect(remoteP2After.lag_group_id).toBe(remoteLag.id)
    expect(remoteP2After.connected_port_id).toBeNull()
    expect(remoteP2After.connected_device_id).toBeNull()
    expect(remoteP2After.connected_device).toBeNull()
    expect(remoteP2After.connected_port).toBeNull()
  })

  it('decouples surviving remote mirror LAG rows on switch delete only for matching remote_device_id', async () => {
    const site = await seedSite(prisma)
    const doomed = await seedSwitch(prisma, { site_id: site.id, name: 'doomed' })
    const survivor = await seedSwitch(prisma, { site_id: site.id, name: 'survivor' })
    const other = await seedSwitch(prisma, { site_id: site.id, name: 'other' })

    const lagToDecouple = await prisma.lagGroup.create({
      data: {
        id: id(), switch_id: survivor.id, name: 'mirror-a', remote_device: 'doomed', remote_device_id: doomed.id,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }
    })
    const lagUnrelated = await prisma.lagGroup.create({
      data: {
        id: id(), switch_id: survivor.id, name: 'mirror-b', remote_device: 'other', remote_device_id: other.id,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }
    })

    expect(await switchRepository.delete(doomed.id)).toBe(true)

    const decoupled = await prisma.lagGroup.findUniqueOrThrow({ where: { id: lagToDecouple.id } })
    const unrelated = await prisma.lagGroup.findUniqueOrThrow({ where: { id: lagUnrelated.id } })
    expect(decoupled.remote_device_id).toBeNull()
    expect(decoupled.remote_device).toBeNull()
    expect(unrelated.remote_device_id).toBe(other.id)
    expect(unrelated.remote_device).toBe('other')
  })

  it('rejects stale LAG create/update before writes (409 with current timestamp)', async () => {
    const sw = await seedSwitch(prisma)
    const p1 = await prisma.port.create({ data: { id: id(), switch_id: sw.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' } })
    const p2 = await prisma.port.create({ data: { id: id(), switch_id: sw.id, unit: 1, index: 2, type: 'rj45', status: 'up', tagged_vlans: '[]' } })
    const stale = '2000-01-01T00:00:00.000Z'

    await expect(lagGroupRepository.create(sw.id, {
      name: 'L1', port_ids: [p1.id, p2.id], expected_updated_at: stale
    } as unknown as Parameters<typeof lagGroupRepository.create>[1])).rejects.toMatchObject({
      statusCode: 409,
      data: { current_updated_at: expect.any(String) }
    })
    expect(await prisma.lagGroup.count()).toBe(0)

    const created = await lagGroupRepository.create(sw.id, { name: 'L2', port_ids: [p1.id, p2.id] })
    await prisma.switch.update({ where: { id: sw.id }, data: { updated_at: new Date(Date.now() + 1_000).toISOString() } })
    await expect(lagGroupRepository.update(created.id, {
      name: 'renamed', expected_updated_at: stale
    } as unknown as Parameters<typeof lagGroupRepository.update>[1])).rejects.toMatchObject({
      statusCode: 409,
      data: { current_updated_at: expect.any(String) }
    })
    expect((await prisma.lagGroup.findUniqueOrThrow({ where: { id: created.id } })).name).toBe('L2')
  })

  it('advances local switch updated_at on successful LAG create/update, then rejects stale follow-up', async () => {
    const sw = await seedSwitch(prisma)
    const p1 = await prisma.port.create({ data: { id: id(), switch_id: sw.id, unit: 1, index: 1, type: 'rj45', status: 'up', tagged_vlans: '[]' } })
    const p2 = await prisma.port.create({ data: { id: id(), switch_id: sw.id, unit: 1, index: 2, type: 'rj45', status: 'up', tagged_vlans: '[]' } })
    const p3 = await prisma.port.create({ data: { id: id(), switch_id: sw.id, unit: 1, index: 3, type: 'rj45', status: 'up', tagged_vlans: '[]' } })

    const beforeCreateTs = (await prisma.switch.findUniqueOrThrow({ where: { id: sw.id }, select: { updated_at: true } })).updated_at
    await new Promise(resolve => setTimeout(resolve, 5))
    const created = await lagGroupRepository.create(sw.id, { name: 'L3', port_ids: [p1.id, p2.id] })
    const afterCreateTs = (await prisma.switch.findUniqueOrThrow({ where: { id: sw.id }, select: { updated_at: true } })).updated_at
    expect(afterCreateTs).not.toBe(beforeCreateTs)

    await new Promise(resolve => setTimeout(resolve, 5))
    const updated = await lagGroupRepository.update(created.id, { port_ids: [p1.id, p3.id], expected_updated_at: afterCreateTs })
    expect(updated.port_ids.sort()).toEqual([p1.id, p3.id].sort())
    const afterUpdateTs = (await prisma.switch.findUniqueOrThrow({ where: { id: sw.id }, select: { updated_at: true } })).updated_at
    expect(afterUpdateTs).not.toBe(afterCreateTs)

    const beforeStaleAttempt = await prisma.port.findUniqueOrThrow({ where: { id: p2.id } })
    await expect(lagGroupRepository.update(created.id, { name: 'stale-rename', expected_updated_at: afterCreateTs }))
      .rejects.toMatchObject({ statusCode: 409 })
    expect((await prisma.lagGroup.findUniqueOrThrow({ where: { id: created.id } })).name).toBe('L3')
    expect(await prisma.port.findUniqueOrThrow({ where: { id: p2.id } })).toEqual(beforeStaleAttempt)
  })

  it('rejects stale switch update in-transaction and keeps state unchanged', async () => {
    const sw = await seedSwitch(prisma, { name: 'before-name' })
    const stale = '1999-01-01T00:00:00.000Z'

    await expect(
      switchRepository.update(sw.id, { name: 'after-name', expected_updated_at: stale })
    ).rejects.toMatchObject({
      statusCode: 409,
      data: { current_updated_at: expect.any(String) }
    })

    const after = await prisma.switch.findUniqueOrThrow({ where: { id: sw.id } })
    expect(after.name).toBe('before-name')
  })

  it('rejects bulk stale/missing/foreign requests atomically', async () => {
    const site = await seedSite(prisma)
    const sw = await seedSwitch(prisma, { site_id: site.id })
    const p1 = await prisma.port.create({ data: { id: id(), switch_id: sw.id, unit: 1, index: 1, type: 'rj45', status: 'down', tagged_vlans: '[]', description: 'keep' } })
    const p2 = await prisma.port.create({ data: { id: id(), switch_id: sw.id, unit: 1, index: 2, type: 'rj45', status: 'down', tagged_vlans: '[]', description: 'keep' } })
    const foreignSwitch = await seedSwitch(prisma, { site_id: site.id })
    const foreign = await prisma.port.create({ data: { id: id(), switch_id: foreignSwitch.id, unit: 1, index: 1, type: 'rj45', status: 'down', tagged_vlans: '[]' } })

    await expect(switchRepository.bulkUpdatePorts(sw.id, [p1.id], { description: 'changed' }, { expectedUpdatedAt: '1999-01-01T00:00:00.000Z' }))
      .rejects.toMatchObject({ statusCode: 409, data: { current_updated_at: expect.any(String) } })

    await expect(switchRepository.bulkUpdatePorts(sw.id, [p1.id, id()], { description: 'changed' }))
      .rejects.toMatchObject({ statusCode: 404 })

    await expect(switchRepository.bulkUpdatePorts(sw.id, [p1.id, foreign.id], { description: 'changed' }))
      .rejects.toMatchObject({ statusCode: 409 })

    const after1 = await prisma.port.findUniqueOrThrow({ where: { id: p1.id } })
    const after2 = await prisma.port.findUniqueOrThrow({ where: { id: p2.id } })
    expect(after1.description).toBe('keep')
    expect(after2.description).toBe('keep')
  })
})
