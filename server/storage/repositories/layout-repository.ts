import type { LayoutTemplate } from '~/types/domain'
import { JsonFileStore } from '../file-store'

const store = new JsonFileStore<LayoutTemplate[]>('layouts.json')

export const layoutRepository = {
  async list() {
    return store.read([])
  },
  async getById(id: string) {
    const items = await store.read([])
    return items.find(item => item.id === id)
  },
  async create(payload: LayoutTemplate) {
    const items = await store.read([])
    items.push(payload)
    await store.write(items)
    return payload
  },
  async update(id: string, payload: Partial<LayoutTemplate>) {
    const items = await store.read([])
    const index = items.findIndex(item => item.id === id)
    if (index < 0) return null

    items[index] = { ...items[index], ...payload }
    await store.write(items)
    return items[index]
  },
  async delete(id: string) {
    const items = await store.read([])
    await store.write(items.filter(item => item.id !== id))
  }
}
