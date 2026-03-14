import { randomUUID } from 'node:crypto'
import { JsonStore } from '../storage/jsonStore'

export class BaseRepository<T extends { id: string }> {
  constructor(protected readonly store: JsonStore<T>) {}

  findAll() {
    return this.store.readAll()
  }

  async findById(id: string) {
    const items = await this.store.readAll()
    return items.find(item => item.id === id)
  }

  async create(payload: Omit<T, 'id'> & { id?: string }) {
    const item = { ...payload, id: payload.id || randomUUID() } as T
    await this.store.upsert(item)
    return item
  }

  async update(id: string, payload: Partial<T>) {
    const current = await this.findById(id)
    if (!current) {
      throw createError({ statusCode: 404, statusMessage: 'Item not found' })
    }

    const next = { ...current, ...payload, id }
    await this.store.upsert(next)
    return next
  }

  delete(id: string) {
    return this.store.delete(id)
  }
}
