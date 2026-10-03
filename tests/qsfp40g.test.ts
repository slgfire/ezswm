import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { bulkUpdatePortsSchema, updatePortSchema } from '../server/validators/switchSchemas'
import { createLayoutTemplateSchema, updateLayoutTemplateSchema } from '../server/validators/layoutTemplateSchemas'
import { layoutTemplateRepository } from '../server/repositories/layoutTemplateRepository'
import { settingsRepository } from '../server/repositories/settingsRepository'
import { switchRepository } from '../server/repositories/switchRepository'
import { mapNetboxType } from '../server/utils/deviceLibrary'
import { DEFAULT_SETTINGS } from '../types/settings'

/**
 * #287 — 40G QSFP support. Isolated Prisma test database only (no real data).
 * Covered: the three Zod speed enums, template -> switch port generation, single + bulk update with readback,
 * the NetBox 40G mapping feeding the template schema, and settings defaults vs. pre-existing stored speed lists.
 * The fresh-install literal in server/plugins/initData.ts is proven by the runtime (fresh setup) check, not by a source-text test.
 */
const EXISTING_SPEEDS = ['100M', '1G', '2.5G', '10G', '100G']
const FRESH_SPEEDS = ['100M', '1G', '2.5G', '10G', '40G', '100G']

const tpl = (speed: unknown) => ({
  name: 'qsfp tpl',
  units: [{ unit_number: 1, blocks: [{ type: 'qsfp', count: 2, start_index: 1, rows: 1, default_speed: speed }] }]
})

describe('40G in the three Zod speed enums', () => {
  it('template block default_speed accepts 40G and every existing value (create + update)', () => {
    for (const s of [...EXISTING_SPEEDS, '40G']) {
      expect(createLayoutTemplateSchema.safeParse(tpl(s)).success, `create ${s}`).toBe(true)
      expect(updateLayoutTemplateSchema.safeParse({ units: tpl(s).units }).success, `update ${s}`).toBe(true)
    }
  })

  it('single-port speed accepts 40G and every existing value', () => {
    for (const s of [...EXISTING_SPEEDS, '40G']) expect(updatePortSchema.safeParse({ speed: s }).success, s).toBe(true)
  })

  it('bulk-port speed accepts 40G and every existing value', () => {
    for (const s of [...EXISTING_SPEEDS, '40G']) {
      expect(bulkUpdatePortsSchema.safeParse({ port_ids: ['p1'], updates: { speed: s } }).success, s).toBe(true)
    }
  })

  it('rejects lowercase 40g/100g and a speed that was never part of the contract', () => {
    for (const bad of ['40g', '100g', '25G', '40 G', 'QSFP']) {
      expect(createLayoutTemplateSchema.safeParse(tpl(bad)).success, `template ${bad}`).toBe(false)
      expect(updatePortSchema.safeParse({ speed: bad }).success, `port ${bad}`).toBe(false)
      expect(bulkUpdatePortsSchema.safeParse({ port_ids: ['p1'], updates: { speed: bad } }).success, `bulk ${bad}`).toBe(false)
    }
  })

  it('does not add XFP: the block type enum still rejects it', () => {
    const bad = { name: 'x', units: [{ unit_number: 1, blocks: [{ type: 'xfp', count: 1, start_index: 1, rows: 1 }] }] }
    expect(createLayoutTemplateSchema.safeParse(bad).success).toBe(false)
  })

  it('the NetBox 40gbase-x-qsfpp speed is a valid template default_speed', () => {
    const mapped = mapNetboxType({ type: '40gbase-x-qsfpp' })!
    expect(mapped).toEqual({ type: 'qsfp', speed: '40G' })
    expect(createLayoutTemplateSchema.safeParse({ ...tpl(mapped.speed), units: [{ unit_number: 1, blocks: [{ type: mapped.type, count: 1, start_index: 1, rows: 1, default_speed: mapped.speed }] }] }).success).toBe(true)
  })
})

describe('40G QSFP persistence (isolated Prisma DB)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteId: string

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
    siteId = (await seedSite(prisma, { name: 'QSFP Site' })).id
  })

  const createTemplate = () => layoutTemplateRepository.create({
    name: 'QSFP Template',
    units: [{
      unit_number: 1,
      blocks: [
        { id: '', type: 'rj45', count: 2, start_index: 1, rows: 1, label: 'RJ', default_speed: '1G' },
        { id: '', type: 'sfp+', count: 2, start_index: 3, rows: 1, label: 'SFP', default_speed: '10G' },
        { id: '', type: 'qsfp', count: 2, start_index: 5, rows: 1, label: 'QSFP', default_speed: '40G' }
      ]
    }]
  })

  it('stores the 40G block default on the template and generates 40G QSFP ports without touching other defaults', async () => {
    const template = await createTemplate()
    const read = await layoutTemplateRepository.getById(template.id)
    expect(read!.units[0]!.blocks.map(b => [b.type, b.default_speed])).toEqual([['rj45', '1G'], ['sfp+', '10G'], ['qsfp', '40G']])

    const sw = await switchRepository.create({ site_id: siteId, name: 'sw-qsfp', layout_template_id: template.id, tags: [], configured_vlans: [] })
    const bySpeed = (type: string) => sw.ports.filter(p => p.type === type).map(p => p.speed)
    expect(bySpeed('qsfp')).toEqual(['40G', '40G'])
    expect(bySpeed('rj45')).toEqual(['1G', '1G'])
    expect(bySpeed('sfp+')).toEqual(['10G', '10G'])
  })

  it('single-port update persists 40G and reads back; sibling ports are unchanged', async () => {
    const template = await createTemplate()
    const sw = await switchRepository.create({ site_id: siteId, name: 'sw-single', layout_template_id: template.id, tags: [], configured_vlans: [] })
    const [q1, q2] = sw.ports.filter(p => p.type === 'qsfp')
    await switchRepository.updatePort(sw.id, q1!.id, { speed: '100G' })
    await switchRepository.updatePort(sw.id, q1!.id, { speed: '40G' })

    const back = await switchRepository.getById(sw.id)
    const byId = new Map(back!.ports.map(p => [p.id, p]))
    expect(byId.get(q1!.id)!.speed).toBe('40G')
    expect(byId.get(q2!.id)!.speed).toBe('40G')
    expect(back!.ports.filter(p => p.type === 'rj45').every(p => p.speed === '1G')).toBe(true)
    expect(back!.ports.filter(p => p.type === 'sfp+').every(p => p.speed === '10G')).toBe(true)
  })

  it('bulk update persists 40G for the selected ports only (other ports keep their speed) and reads back', async () => {
    const template = await createTemplate()
    const sw = await switchRepository.create({ site_id: siteId, name: 'sw-bulk', layout_template_id: template.id, tags: [], configured_vlans: [] })
    const rj = sw.ports.filter(p => p.type === 'rj45')
    const q = sw.ports.filter(p => p.type === 'qsfp')
    await switchRepository.bulkUpdatePorts(sw.id, [q[0]!.id], { speed: '100G' })
    await switchRepository.bulkUpdatePorts(sw.id, [q[0]!.id, rj[0]!.id], { speed: '40G' })

    const back = await switchRepository.getById(sw.id)
    const byId = new Map(back!.ports.map(p => [p.id, p]))
    expect(byId.get(q[0]!.id)!.speed).toBe('40G')
    expect(byId.get(rj[0]!.id)!.speed).toBe('40G')
    expect(byId.get(rj[1]!.id)!.speed).toBe('1G')
    expect(byId.get(q[1]!.id)!.speed).toBe('40G')
  })
})

describe('settings port_speeds: fresh defaults vs. stored lists', () => {
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

  it('DEFAULT_SETTINGS lists 40G between 10G and 100G in order, and an empty DB returns that default', async () => {
    expect(DEFAULT_SETTINGS.port_speeds).toEqual(FRESH_SPEEDS)
    expect((await settingsRepository.get()).port_speeds).toEqual(FRESH_SPEEDS)
  })

  it('an existing stored speed list WITHOUT 40G is read back verbatim (no backfill) and survives an unrelated update', async () => {
    await prisma.appSettings.create({
      data: {
        id: 'singleton', app_name: 'ezSWM', app_logo_url: null, default_vlan: null, default_port_status: 'down',
        port_speeds: JSON.stringify(EXISTING_SPEEDS), setup_completed: true, sites_initialized: true, patch_panels_enabled: false
      }
    })
    expect((await settingsRepository.get()).port_speeds).toEqual(EXISTING_SPEEDS)
    await settingsRepository.update({ app_name: 'ezSWM' })
    expect((await settingsRepository.get()).port_speeds).toEqual(EXISTING_SPEEDS)
  })

  it('a stored list that already contains 40G keeps its own order', async () => {
    await settingsRepository.update({ port_speeds: ['1G', '40G', '10G'] })
    expect((await settingsRepository.get()).port_speeds).toEqual(['1G', '40G', '10G'])
  })
})
