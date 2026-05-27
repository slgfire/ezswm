import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import { incrementMemberLabel } from '../utils/deviceLibrary'
import type { LayoutTemplate } from '../../types/layoutTemplate'
import type { Port, PortType } from '../../types/port'
import type { Switch } from '../../types/switch'

const FILE_NAME = 'layout-templates.json'
const SWITCHES_FILE = 'switches.json'

function generatePortLabel(blockLabel: string | undefined, unitNumber: number, portIndex: number): string {
  if (!blockLabel) return `${unitNumber}/${portIndex}`
  return blockLabel.match(/[/\-:.]$/) ? `${blockLabel}${portIndex}` : `${blockLabel} ${unitNumber}/${portIndex}`
}

interface ExpectedPort {
  unit: number
  index: number
  type: PortType
  label: string
}

function buildExpectedPorts(template: LayoutTemplate, stackSize: number): ExpectedPort[] {
  const expected: ExpectedPort[] = []
  for (let member = 1; member <= stackSize; member++) {
    const unitOffset = (member - 1) * template.units.length
    for (const unit of template.units) {
      for (const block of unit.blocks) {
        const memberLabel = block.label
          ? incrementMemberLabel(block.label, member)
          : block.label
        for (let i = 0; i < block.count; i++) {
          const portIndex = block.start_index + i
          const stackedUnit = unit.unit_number + unitOffset
          expected.push({
            unit: stackedUnit,
            index: portIndex,
            type: block.type,
            label: generatePortLabel(memberLabel, stackedUnit, portIndex)
          })
        }
      }
    }
  }
  return expected
}

function syncPortsToTemplate(template: LayoutTemplate): void {
  const switches = readJson<Switch[]>(SWITCHES_FILE)
  let changed = false

  for (const sw of switches) {
    if (sw.layout_template_id !== template.id) continue

    const stackSize = sw.stack_size ?? 1
    const expectedPorts = buildExpectedPorts(template, stackSize)

    // Match existing ports by (unit, index, type) to keep their settings.
    // Same-key duplicates (rare) are matched in original order; unmatched
    // expected ports become fresh ports; unmatched existing ports are dropped.
    const consumed = new Set<string>()
    const newPorts: Port[] = []

    for (const ep of expectedPorts) {
      const existing = sw.ports.find(p =>
        !consumed.has(p.id) &&
        p.unit === ep.unit &&
        p.index === ep.index &&
        p.type === ep.type
      )

      if (existing) {
        consumed.add(existing.id)
        const oldLabel = existing.label
        existing.label = ep.label
        newPorts.push(existing)

        if (oldLabel !== ep.label) {
          changed = true
          for (const otherSw of switches) {
            for (const otherPort of otherSw.ports) {
              if (otherPort.connected_device_id === sw.id && otherPort.connected_port_id === existing.id) {
                otherPort.connected_port = ep.label
              }
            }
          }
        }
      } else {
        newPorts.push({
          id: nanoid(),
          unit: ep.unit,
          index: ep.index,
          label: ep.label,
          type: ep.type,
          status: 'down',
          tagged_vlans: []
        })
        changed = true
      }
    }

    if (consumed.size !== sw.ports.length) {
      // Some existing ports no longer match the template — drop them
      changed = true
    }

    sw.ports = newPorts
    sw.updated_at = new Date().toISOString()
  }

  if (changed) {
    writeJson(SWITCHES_FILE, switches)
  }
}

export const layoutTemplateRepository = {
  list(): LayoutTemplate[] {
    return readJson<LayoutTemplate[]>(FILE_NAME)
  },

  getById(id: string): LayoutTemplate | null {
    const templates = this.list()
    return templates.find(t => t.id === id) || null
  },

  create(data: Omit<LayoutTemplate, 'id' | 'created_at' | 'updated_at'>): LayoutTemplate {
    const templates = this.list()

    if (templates.some(t => t.name === data.name)) {
      throw createError({ statusCode: 409, message: `Template name '${data.name}' already exists` })
    }

    // Assign IDs to blocks
    const units = data.units.map(unit => ({
      ...unit,
      blocks: unit.blocks.map(block => ({
        ...block,
        id: block.id || nanoid()
      }))
    }))

    const now = new Date().toISOString()
    const template: LayoutTemplate = {
      id: nanoid(),
      ...data,
      units,
      created_at: now,
      updated_at: now
    }

    templates.push(template)
    writeJson(FILE_NAME, templates)
    return template
  },

  update(id: string, data: Partial<Omit<LayoutTemplate, 'id' | 'created_at'>>): LayoutTemplate {
    const templates = this.list()
    const index = templates.findIndex(t => t.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'Layout template not found' })
    }

    if (data.name && data.name !== templates[index]!.name) {
      if (templates.some(t => t.name === data.name)) {
        throw createError({ statusCode: 409, message: `Template name '${data.name}' already exists` })
      }
    }

    if (data.units) {
      data.units = data.units.map(unit => ({
        ...unit,
        blocks: unit.blocks.map(block => ({
          ...block,
          id: block.id || nanoid()
        }))
      }))
    }

    templates[index] = {
      ...templates[index],
      ...data,
      updated_at: new Date().toISOString()
    } as LayoutTemplate

    writeJson(FILE_NAME, templates)

    // Sync ports to all switches using this template
    if (data.units) {
      syncPortsToTemplate(templates[index]!)
    }

    return templates[index]!
  },

  duplicate(id: string): LayoutTemplate {
    const original = this.getById(id)
    if (!original) {
      throw createError({ statusCode: 404, message: 'Layout template not found' })
    }

    const templates = this.list()
    let copyName = `${original.name} (Copy)`
    let counter = 1
    while (templates.some(t => t.name === copyName)) {
      counter++
      copyName = `${original.name} (Copy ${counter})`
    }

    const now = new Date().toISOString()
    const duplicate: LayoutTemplate = {
      id: nanoid(),
      name: copyName,
      manufacturer: original.manufacturer,
      model: original.model,
      description: original.description,
      units: original.units.map(unit => ({
        ...unit,
        blocks: unit.blocks.map(block => ({
          ...block,
          id: nanoid()
        }))
      })),
      created_at: now,
      updated_at: now
    }

    templates.push(duplicate)
    writeJson(FILE_NAME, templates)
    return duplicate
  },

  delete(id: string): boolean {
    const templates = this.list()
    const index = templates.findIndex(t => t.id === id)
    if (index === -1) return false

    templates.splice(index, 1)
    writeJson(FILE_NAME, templates)
    return true
  }
}
