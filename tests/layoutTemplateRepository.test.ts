import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { layoutTemplateRepository } from '../server/repositories/layoutTemplateRepository'
import { switchRepository } from '../server/repositories/switchRepository'

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
})
