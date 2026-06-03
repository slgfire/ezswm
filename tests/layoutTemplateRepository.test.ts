import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setTestRuntimeConfig, resetTestRuntimeConfig, seedJsonFile } from './testHelpers'
import { layoutTemplateRepository } from '../server/repositories/layoutTemplateRepository'
import { switchRepository } from '../server/repositories/switchRepository'

describe.skip('layoutTemplateRepository — port preservation on template update', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ezswm-vitest-'))
    setTestRuntimeConfig({ dataDir: tempDir })
    seedJsonFile(tempDir, 'layout-templates.json', [])
    seedJsonFile(tempDir, 'switches.json', [])
    seedJsonFile(tempDir, 'sites.json', [{ id: 'site-1', name: 'Test Site' }])
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    resetTestRuntimeConfig()
  })

  it('preserves all per-port settings when only block labels change', () => {
    // 1. Create a template with two blocks
    const template = layoutTemplateRepository.create({
      name: 'Test Template',
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ' },
          { type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP' }
        ]
      }]
    })

    // 2. Create a switch with that template
    const sw = switchRepository.create({
      site_id: 'site-1',
      name: 'sw-test',
      layout_template_id: template.id
    })

    expect(sw.ports.length).toBe(6)
    // Order should be indices 1..6
    expect(sw.ports.map(p => p.index)).toEqual([1, 2, 3, 4, 5, 6])

    // 3. Configure ports with distinct markers
    for (const port of sw.ports) {
      switchRepository.updatePort(sw.id, port.id, {
        description: `Config for port idx=${port.index}`
      })
    }

    // 4. Update template — only change block labels
    layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ-new' },
          { type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP-new' }
        ]
      }]
    })

    // 5. Verify each port still has the correct configuration
    const updated = switchRepository.getById(sw.id)
    expect(updated).toBeTruthy()
    const portsByIndex = new Map(updated!.ports.map(p => [p.index, p]))
    for (let idx = 1; idx <= 6; idx++) {
      const p = portsByIndex.get(idx)
      expect(p, `port with index=${idx} should exist`).toBeTruthy()
      expect(p!.description, `port idx=${idx} should keep its description`).toBe(`Config for port idx=${idx}`)
    }
  })

  it('preserves all per-port settings when stack_size > 1 and labels change', () => {
    const template = layoutTemplateRepository.create({
      name: 'Stacked Template',
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ' },
          { type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP' }
        ]
      }]
    })
    const sw = switchRepository.create({
      site_id: 'site-1',
      name: 'sw-stacked',
      layout_template_id: template.id,
      stack_size: 2
    })

    expect(sw.ports.length).toBe(12) // 6 ports × 2 members
    for (const port of sw.ports) {
      switchRepository.updatePort(sw.id, port.id, {
        description: `port unit=${port.unit} idx=${port.index}`
      })
    }

    layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ-new' },
          { type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP-new' }
        ]
      }]
    })

    const updated = switchRepository.getById(sw.id)
    expect(updated!.ports.length).toBe(12)
    for (const port of updated!.ports) {
      expect(port.description, `port unit=${port.unit} idx=${port.index}`).toBe(`port unit=${port.unit} idx=${port.index}`)
    }
  })

  it('preserves per-port settings when block rows count changes', () => {
    const template = layoutTemplateRepository.create({
      name: 'Rows Template',
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ' },
          { type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP' }
        ]
      }]
    })
    const sw = switchRepository.create({
      site_id: 'site-1',
      name: 'sw-rows',
      layout_template_id: template.id
    })
    for (const port of sw.ports) {
      switchRepository.updatePort(sw.id, port.id, { description: `idx=${port.index}` })
    }

    // Change rows from 2 to 1 (visual only — port indices unchanged)
    layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 1, label: 'RJ' },
          { type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'SFP' }
        ]
      }]
    })

    const updated = switchRepository.getById(sw.id)
    for (const port of updated!.ports) {
      expect(port.description).toBe(`idx=${port.index}`)
    }
  })

  it('preserves per-port settings when two blocks share index ranges', () => {
    // Matches screenshot from issue #132: RJ45 block ports 1..N and
    // SFP+ block ports 1..M both starting at start_index=1 (or similar overlap)
    const template = layoutTemplateRepository.create({
      name: 'OverlapTemplate',
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ45' },
          { type: 'sfp+', count: 2, start_index: 1, rows: 1, label: 'SFP+' }
        ]
      }]
    })
    const sw = switchRepository.create({
      site_id: 'site-1',
      name: 'sw-overlap',
      layout_template_id: template.id
    })

    expect(sw.ports.length).toBe(6)

    // Tag each port with a unique marker tied to its (id, unit, index, type)
    for (const port of sw.ports) {
      switchRepository.updatePort(sw.id, port.id, {
        description: `id=${port.id} type=${port.type} idx=${port.index}`
      })
    }

    // Snapshot pre-update assignment: which type lives on which port id
    const before = new Map(
      switchRepository.getById(sw.id)!.ports.map(p => [p.id, { type: p.type, index: p.index, description: p.description }])
    )

    // Template update — only labels change
    layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'RJ45-new' },
          { type: 'sfp+', count: 2, start_index: 1, rows: 1, label: 'SFP+-new' }
        ]
      }]
    })

    const after = switchRepository.getById(sw.id)!
    for (const port of after.ports) {
      const original = before.get(port.id)
      expect(original, `port id=${port.id} should still exist after sync`).toBeTruthy()
      expect(port.type, `port id=${port.id} should keep its type`).toBe(original!.type)
      expect(port.index, `port id=${port.id} should keep its index`).toBe(original!.index)
      expect(port.description, `port id=${port.id} should keep its description`).toBe(original!.description)
    }
  })

  it('preserves port ids when only block labels change', () => {
    const template = layoutTemplateRepository.create({
      name: 'IdTemplate',
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'A' },
          { type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'B' }
        ]
      }]
    })
    const sw = switchRepository.create({
      site_id: 'site-1',
      name: 'sw-ids',
      layout_template_id: template.id
    })

    const idsByIndex = new Map(sw.ports.map(p => [p.index, p.id]))

    layoutTemplateRepository.update(template.id, {
      units: [{
        unit_number: 1,
        blocks: [
          { type: 'rj45', count: 4, start_index: 1, rows: 2, label: 'A-new' },
          { type: 'sfp+', count: 2, start_index: 5, rows: 1, label: 'B-new' }
        ]
      }]
    })

    const updated = switchRepository.getById(sw.id)
    for (const port of updated!.ports) {
      expect(port.id, `port idx=${port.index} id must be unchanged`).toBe(idsByIndex.get(port.index))
    }
  })
})
