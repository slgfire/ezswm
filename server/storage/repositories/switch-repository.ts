import type { NetworkSwitch } from '~/types/domain'
import { JsonFileStore } from '../file-store'

const store = new JsonFileStore<NetworkSwitch[]>('switches.json')

export const switchRepository = {
  async list() {
    return store.read([])
  },
  async getById(id: string) {
    const items = await store.read([])
    return items.find(item => item.id === id)
  },
  async create(payload: NetworkSwitch) {
    const items = await store.read([])
    items.push(payload)
    await store.write(items)
    return payload
  },
  async update(id: string, payload: Partial<NetworkSwitch>) {
    const items = await store.read([])
    const index = items.findIndex(item => item.id === id)
    if (index < 0) return null

    items[index] = { ...items[index], ...payload }
    await store.write(items)
    return items[index]
  },
  async delete(id: string) {
    const items = await store.read([])
    const filtered = items.filter(item => item.id !== id)
    await store.write(filtered)
  }
}
