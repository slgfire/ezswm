import type { LayoutTemplate } from '~/types/models'
import { dataStore } from '../data-store'

export const layoutRepository = {
  async list(): Promise<LayoutTemplate[]> {
    const data = await dataStore.read()
    return data.layoutTemplates.sort((a, b) => a.name.localeCompare(b.name))
  },
  async create(payload: Omit<LayoutTemplate, 'id'>) {
    const data = await dataStore.read()
    const created = { ...payload, id: dataStore.nextId('layout') }
    data.layoutTemplates.push(created)
    await dataStore.write(data)
    return created
  },
  async update(id: string, payload: Partial<Omit<LayoutTemplate, 'id'>>) {
    const data = await dataStore.read()
    const index = data.layoutTemplates.findIndex((item) => item.id === id)
    if (index === -1) {
      return undefined
    }

    data.layoutTemplates[index] = { ...data.layoutTemplates[index], ...payload }
    await dataStore.write(data)
    return data.layoutTemplates[index]
  },
  async delete(id: string) {
    const data = await dataStore.read()
    const lengthBefore = data.layoutTemplates.length
    data.layoutTemplates = data.layoutTemplates.filter((item) => item.id !== id)
    if (lengthBefore === data.layoutTemplates.length) {
      return false
    }

    await dataStore.write(data)
    return true
  }
}
