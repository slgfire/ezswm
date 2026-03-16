import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { LayoutTemplate } from '../../types/layoutTemplate'

const FILE_NAME = 'layoutTemplates.json'

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
