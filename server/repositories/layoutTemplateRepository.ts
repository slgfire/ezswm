import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { LayoutTemplate } from '../../types/layoutTemplate'
import type { Switch } from '../../types/switch'

const FILE_NAME = 'layoutTemplates.json'
const SWITCHES_FILE = 'switches.json'

function generatePortLabel(blockLabel: string | undefined, unitNumber: number, portIndex: number): string {
  if (!blockLabel) return `${unitNumber}/${portIndex}`
  return blockLabel.match(/[\/\-:.]$/) ? `${blockLabel}${portIndex}` : `${blockLabel} ${unitNumber}/${portIndex}`
}

function syncPortLabelsToSwitches(template: LayoutTemplate): void {
  const switches = readJson<Switch[]>(SWITCHES_FILE)
  let changed = false

  for (const sw of switches) {
    if (sw.layout_template_id !== template.id) continue

    for (const unit of template.units) {
      for (const block of unit.blocks) {
        for (let i = 0; i < block.count; i++) {
          const portIndex = block.start_index + i
          const newLabel = generatePortLabel(block.label, unit.unit_number, portIndex)

          const port = sw.ports.find(p => p.unit === unit.unit_number && p.index === portIndex)
          if (port && port.label !== newLabel) {
            const oldLabel = port.label
            port.label = newLabel
            changed = true

            // Update cross-references: other ports connected to this port show its label
            for (const otherSw of switches) {
              for (const otherPort of otherSw.ports) {
                if (otherPort.connected_device_id === sw.id && otherPort.connected_port_id === port.id) {
                  otherPort.connected_port = newLabel
                }
              }
            }
          }
        }
      }
    }

    if (changed) {
      sw.updated_at = new Date().toISOString()
    }
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

    if (data.name && data.name !== templates[index].name) {
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
    }

    writeJson(FILE_NAME, templates)

    // Sync port labels to all switches using this template
    if (data.units) {
      syncPortLabelsToSwitches(templates[index])
    }

    return templates[index]
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
