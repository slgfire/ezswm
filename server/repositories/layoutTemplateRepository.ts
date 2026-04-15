import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { LayoutTemplate } from '../../types/layoutTemplate'
import type { Switch } from '../../types/switch'

const FILE_NAME = 'layoutTemplates.json'
const SWITCHES_FILE = 'switches.json'

function generatePortLabel(blockLabel: string | undefined, unitNumber: number, portIndex: number): string {
  if (!blockLabel) return `${unitNumber}/${portIndex}`
  return blockLabel.match(/[/\-:.]$/) ? `${blockLabel}${portIndex}` : `${blockLabel} ${unitNumber}/${portIndex}`
}

function syncPortsToTemplate(template: LayoutTemplate): void {
  const switches = readJson<Switch[]>(SWITCHES_FILE)
  let changed = false

  for (const sw of switches) {
    if (sw.layout_template_id !== template.id) continue

    // Build map of what ports SHOULD exist based on new template
    const expectedPorts: { unit: number; index: number; type: string; label: string; blockLabel?: string }[] = []
    for (const unit of template.units) {
      for (const block of unit.blocks) {
        for (let i = 0; i < block.count; i++) {
          const portIndex = block.start_index + i
          expectedPorts.push({
            unit: unit.unit_number,
            index: portIndex,
            type: block.type,
            label: generatePortLabel(block.label, unit.unit_number, portIndex),
            blockLabel: block.label
          })
        }
      }
    }

    // Match existing ports by unit+position-in-block (not by index)
    // This preserves settings when start_index changes
    const newPorts: any[] = []
    const existingByUnit: Record<number, any[]> = {}
    for (const p of sw.ports) {
      if (!existingByUnit[p.unit]) existingByUnit[p.unit] = []
      existingByUnit[p.unit]!.push(p)
    }
    // Sort each unit's ports by index
    for (const unit of Object.keys(existingByUnit)) {
      existingByUnit[Number(unit)]!.sort((a: any, b: any) => a.index - b.index)
    }

    // Group expected ports by unit
    const expectedByUnit: Record<number, typeof expectedPorts> = {}
    for (const ep of expectedPorts) {
      if (!expectedByUnit[ep.unit]) expectedByUnit[ep.unit] = []
      expectedByUnit[ep.unit]!.push(ep)
    }

    for (const ep of expectedPorts) {
      const unitExisting = existingByUnit[ep.unit] || []
      const unitExpected = expectedByUnit[ep.unit] || []
      const posInBlock = unitExpected.indexOf(ep)

      // Try to match by same position in the unit's port list
      const existingPort = unitExisting[posInBlock]

      if (existingPort) {
        // Preserve all settings, update index/label/type
        const oldLabel = existingPort.label
        existingPort.index = ep.index
        existingPort.label = ep.label
        existingPort.type = ep.type
        newPorts.push(existingPort)

        if (oldLabel !== ep.label) {
          changed = true
          // Update cross-references
          for (const otherSw of switches) {
            for (const otherPort of otherSw.ports) {
              if (otherPort.connected_device_id === sw.id && otherPort.connected_port_id === existingPort.id) {
                otherPort.connected_port = ep.label
              }
            }
          }
        }
      } else {
        // New port (template has more ports than before)
        const { nanoid } = require('nanoid')
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

    if (JSON.stringify(sw.ports.map((p: any) => p.index)) !== JSON.stringify(newPorts.map((p: any) => p.index))) {
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
