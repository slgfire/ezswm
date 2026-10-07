import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { layoutTemplateRepository } from '../server/repositories/layoutTemplateRepository'
import { switchRepository } from '../server/repositories/switchRepository'
import { createLayoutTemplateSchema, updateLayoutTemplateSchema } from '../server/validators/layoutTemplateSchemas'

describe('layoutTemplateRepository — port preservation on template update', () => {
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
    siteId = (await seedSite(prisma, { name: 'Test Site' })).id
  })

  it('preserves all per-port settings when only block labels change', async () => {
    const template = await layoutTemplateRepository.create({
      name: 'Test Template',
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ' },
          { id: '', type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP' }
        ]
      }]
    })

    const sw = await switchRepository.create({
      site_id: siteId,
      name: 'sw-test',
      layout_template_id: template.id,
      tags: [],
      configured_vlans: []
    })

    expect(sw.ports.length).toBe(6)
    expect(sw.ports.map(p => p.index)).toEqual([1, 2, 3, 4, 5, 6])

    for (const port of sw.ports) {
      await switchRepository.updatePort(sw.id, port.id, {
        description: `Config for port idx=${port.index}`
      })
    }

    await layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ-new' },
          { id: '', type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP-new' }
        ]
      }]
    })

    const updated = await switchRepository.getById(sw.id)
    expect(updated).toBeTruthy()
    const portsByIndex = new Map(updated!.ports.map(p => [p.index, p]))
    for (let idx = 1; idx <= 6; idx++) {
      const p = portsByIndex.get(idx)
      expect(p, `port with index=${idx} should exist`).toBeTruthy()
      expect(p!.description, `port idx=${idx} should keep its description`).toBe(`Config for port idx=${idx}`)
    }
  })

  it('preserves all per-port settings when stack_size > 1 and labels change', async () => {
    const template = await layoutTemplateRepository.create({
      name: 'Stacked Template',
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ' },
          { id: '', type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP' }
        ]
      }]
    })

    const sw = await switchRepository.create({
      site_id: siteId,
      name: 'sw-stacked',
      layout_template_id: template.id,
      stack_size: 2,
      tags: [],
      configured_vlans: []
    })

    expect(sw.ports.length).toBe(12)
    for (const port of sw.ports) {
      await switchRepository.updatePort(sw.id, port.id, {
        description: `port unit=${port.unit} idx=${port.index}`
      })
    }

    await layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ-new' },
          { id: '', type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP-new' }
        ]
      }]
    })

    const updated = await switchRepository.getById(sw.id)
    expect(updated!.ports.length).toBe(12)
    for (const port of updated!.ports) {
      expect(port.description, `port unit=${port.unit} idx=${port.index}`).toBe(`port unit=${port.unit} idx=${port.index}`)
    }
  })

  it('preserves per-port settings when block rows count changes', async () => {
    const template = await layoutTemplateRepository.create({
      name: 'Rows Template',
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ' },
          { id: '', type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP' }
        ]
      }]
    })

    const sw = await switchRepository.create({
      site_id: siteId,
      name: 'sw-rows',
      layout_template_id: template.id,
      tags: [],
      configured_vlans: []
    })
    for (const port of sw.ports) {
      await switchRepository.updatePort(sw.id, port.id, { description: `idx=${port.index}` })
    }

    await layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 1, label: 'RJ' },
          { id: '', type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP' }
        ]
      }]
    })

    const updated = await switchRepository.getById(sw.id)
    for (const port of updated!.ports) {
      expect(port.description).toBe(`idx=${port.index}`)
    }
  })

  it('preserves per-port settings when two blocks share index ranges', async () => {
    const template = await layoutTemplateRepository.create({
      name: 'OverlapTemplate',
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ45' },
          { id: '', type: 'sfp+', count: 2, start_index: 1, rows: 1, label: 'SFP+' }
        ]
      }]
    })

    const sw = await switchRepository.create({
      site_id: siteId,
      name: 'sw-overlap',
      layout_template_id: template.id,
      tags: [],
      configured_vlans: []
    })

    expect(sw.ports.length).toBe(6)

    for (const port of sw.ports) {
      await switchRepository.updatePort(sw.id, port.id, {
        description: `id=${port.id} type=${port.type} idx=${port.index}`
      })
    }

    const before = new Map(
      (await switchRepository.getById(sw.id))!.ports.map(p => [p.id, { type: p.type, index: p.index, description: p.description }])
    )

    await layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ45-new' },
          { id: '', type: 'sfp+', count: 2, start_index: 1, rows: 1, label: 'SFP+-new' }
        ]
      }]
    })

    const after = (await switchRepository.getById(sw.id))!
    for (const port of after.ports) {
      const original = before.get(port.id)
      expect(original, `port id=${port.id} should still exist after sync`).toBeTruthy()
      expect(port.type, `port id=${port.id} should keep its type`).toBe(original!.type)
      expect(port.index, `port id=${port.id} should keep its index`).toBe(original!.index)
      expect(port.description, `port id=${port.id} should keep its description`).toBe(original!.description)
    }
  })

  it('preserves port ids when only block labels change', async () => {
    const template = await layoutTemplateRepository.create({
      name: 'IdTemplate',
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'A' },
          { id: '', type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'B' }
        ]
      }]
    })

    const sw = await switchRepository.create({
      site_id: siteId,
      name: 'sw-ids',
      layout_template_id: template.id,
      tags: [],
      configured_vlans: []
    })

    const idsByIndex = new Map(sw.ports.map(p => [p.index, p.id]))

    await layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { id: '', type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'A-new' },
          { id: '', type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'B-new' }
        ]
      }]
    })

    const updated = await switchRepository.getById(sw.id)
    for (const port of updated!.ports) {
      expect(port.id, `port idx=${port.index} id must be unchanged`).toBe(idsByIndex.get(port.index))
    }
  })

  describe('block id preservation on update', () => {
    const blk = (extra: Record<string, unknown>) => ({ type: 'rj45', count: 2, start_index: 1, rows: 1, ...extra })
    const ids = async (templateId: string) => (await layoutTemplateRepository.getById(templateId))!.units.flatMap(u => u.blocks.map(b => b.id))
    const mk = (name: string) => layoutTemplateRepository.create({
      name,
      units: [
        { unit_number: 1, blocks: [{ id: '', type: 'rj45', count: 2, start_index: 1, rows: 1, label: 'A' }, { id: '', type: 'sfp+', count: 2, start_index: 3, rows: 1, label: 'B' }] },
        { unit_number: 2, blocks: [{ id: '', type: 'rj45', count: 2, start_index: 1, rows: 1, label: 'C' }] }
      ]
    })

    it('schema: create strips id, update accepts non-uuid ids and treats empty id as omitted, duplicate ids are rejected', () => {
      const created = createLayoutTemplateSchema.parse({ name: 'x', units: [{ unit_number: 1, blocks: [blk({ id: 'client-id' })] }] })
      expect('id' in created.units[0]!.blocks[0]!).toBe(false)
      const upd = updateLayoutTemplateSchema.parse({ units: [{ unit_number: 1, blocks: [blk({ id: 'legacy-1' }), blk({ id: '' }), blk({})] }] })
      expect(upd.units![0]!.blocks.map(b => (b as { id?: string }).id)).toEqual(['legacy-1', undefined, undefined])
      expect(updateLayoutTemplateSchema.safeParse({ units: [{ unit_number: 1, blocks: [blk({ id: 'd' }), blk({ id: 'd' })] }] }).success).toBe(false)
      expect(updateLayoutTemplateSchema.safeParse({ units: [{ unit_number: 1, blocks: [blk({ id: 'd' })] }, { unit_number: 2, blocks: [blk({ id: 'd' })] }] }).success).toBe(false)
    })

    it('preserves supplied block ids across description, full units and a reorder / unit move', async () => {
      const t = await mk('IdKeep')
      const [a, b, c] = await ids(t.id)
      const updated = await layoutTemplateRepository.update(t.id, {
        description: 'new description',
        units: [
          { unit_number: 1, blocks: [{ id: c!, type: 'rj45', count: 2, start_index: 1, rows: 1, label: 'C' }, { id: a!, type: 'rj45', count: 2, start_index: 3, rows: 1, label: 'A' }] },
          { unit_number: 2, blocks: [{ id: b!, type: 'sfp+', count: 2, start_index: 1, rows: 1, label: 'B' }] }
        ]
      })
      expect(updated.units.flatMap(u => u.blocks.map(x => x.id))).toEqual([c, a, b])
      expect(updated.description).toBe('new description')
    })

    it('gives a block without id a fresh unique id and keeps the others', async () => {
      const t = await mk('IdNew')
      const [a, b, c] = await ids(t.id)
      const updated = await layoutTemplateRepository.update(t.id, {
        units: [{ unit_number: 1, blocks: [
          { id: a!, type: 'rj45', count: 2, start_index: 1, rows: 1 },
          { id: '', type: 'rj45', count: 1, start_index: 9, rows: 1 }
        ] }]
      })
      const got = updated.units[0]!.blocks.map(x => x.id)
      expect(got[0]).toBe(a)
      expect(got[1]).toBeTruthy()
      expect([a, b, c]).not.toContain(got[1])
    })

    it('legacy callers without ids (or empty ids) still receive fresh ids', async () => {
      const t = await mk('IdLegacy')
      const before = await ids(t.id)
      const updated = await layoutTemplateRepository.update(t.id, {
        units: [{ unit_number: 1, blocks: [{ id: '', type: 'rj45', count: 2, start_index: 1, rows: 1 }, { type: 'rj45', count: 2, start_index: 3, rows: 1 } as never] }]
      })
      const got = updated.units[0]!.blocks.map(x => x.id)
      expect(got.every(Boolean)).toBe(true)
      expect(new Set(got).size).toBe(2)
      for (const id of got) expect(before).not.toContain(id)
    })

    it('rejects unknown and foreign block ids with 409 and leaves the template unchanged', async () => {
      const t = await mk('IdForeign')
      const other = await mk('IdOther')
      const [otherId] = await ids(other.id)
      const snapshot = JSON.stringify(await layoutTemplateRepository.getById(t.id))
      for (const bad of ['stale-unknown-id', otherId!]) {
        await expect(layoutTemplateRepository.update(t.id, {
          name: 'ShouldNotApply',
          units: [{ unit_number: 1, blocks: [{ id: bad, type: 'rj45', count: 2, start_index: 1, rows: 1 }] }]
        })).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/reload/i) })
      }
      expect(JSON.stringify(await layoutTemplateRepository.getById(t.id))).toBe(snapshot)
    })

    it('rejects duplicate supplied ids with 400 and leaves the template unchanged', async () => {
      const t = await mk('IdDupPayload')
      const [a] = await ids(t.id)
      const snapshot = JSON.stringify(await layoutTemplateRepository.getById(t.id))
      await expect(layoutTemplateRepository.update(t.id, {
        units: [{ unit_number: 1, blocks: [{ id: a!, type: 'rj45', count: 2, start_index: 1, rows: 1 }, { id: a!, type: 'rj45', count: 2, start_index: 3, rows: 1 }] }]
      })).rejects.toMatchObject({ statusCode: 400 })
      expect(JSON.stringify(await layoutTemplateRepository.getById(t.id))).toBe(snapshot)
    })

    it('currently stored duplicate ids: units save is an explicit 400 (no renumbering), metadata-only update still works', async () => {
      const t = await mk('IdDupStored')
      const [a] = await ids(t.id)
      const row = await prisma.layoutTemplate.findUnique({ where: { id: t.id } })
      const units = JSON.parse(row!.units) as Array<{ blocks: Array<{ id: string }> }>
      units[1]!.blocks[0]!.id = a!
      await prisma.layoutTemplate.update({ where: { id: t.id }, data: { units: JSON.stringify(units) } })
      const snapshot = (await prisma.layoutTemplate.findUnique({ where: { id: t.id } }))!.units
      await expect(layoutTemplateRepository.update(t.id, {
        units: [{ unit_number: 1, blocks: [{ id: a!, type: 'rj45', count: 2, start_index: 1, rows: 1 }] }]
      })).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/duplicate stored/i) })
      expect((await prisma.layoutTemplate.findUnique({ where: { id: t.id } }))!.units).toBe(snapshot)
      const meta = await layoutTemplateRepository.update(t.id, { description: 'metadata only' })
      expect(meta.description).toBe('metadata only')
      // A units payload without any (or with empty) ids is the legacy path: it succeeds and re-mints all ids.
      const before = (await layoutTemplateRepository.getById(t.id))!.units.flatMap(u => u.blocks.map(b => b.id))
      const reminted = await layoutTemplateRepository.update(t.id, {
        units: [{ unit_number: 1, blocks: [{ id: '', type: 'rj45', count: 2, start_index: 1, rows: 1 }, { type: 'rj45', count: 2, start_index: 3, rows: 1 } as never] }]
      })
      const fresh = reminted.units.flatMap(u => u.blocks.map(b => b.id))
      expect(new Set(fresh).size).toBe(2)
      for (const id of fresh) expect(before).not.toContain(id)
    })

    it('duplicate gives fresh ids and create assigns fresh ids even when a source id is passed through the parsed input', async () => {
      const t = await mk('IdDup')
      const source = await ids(t.id)
      const copy = await layoutTemplateRepository.duplicate(t.id)
      const copyIds = copy.units.flatMap(u => u.blocks.map(b => b.id))
      expect(copyIds.every(Boolean)).toBe(true)
      for (const id of copyIds) expect(source).not.toContain(id)
      const parsed = createLayoutTemplateSchema.parse({ name: 'FromSource', units: [{ unit_number: 1, blocks: [blk({ id: source[0] })] }] })
      const created = await layoutTemplateRepository.create(parsed as never)
      expect(created.units[0]!.blocks[0]!.id).toBeTruthy()
      expect(source).not.toContain(created.units[0]!.blocks[0]!.id)
    })
  })
})
