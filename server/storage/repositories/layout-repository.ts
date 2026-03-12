import type { LayoutTemplate } from '~/types/models'
import type { LayoutRepository } from '~/server/storage/interfaces/repositories'
import type { StorageEngine } from '~/server/storage/interfaces/storage-engine'
import { newId } from '~/server/storage/shared/utils'

export class JsonLayoutRepository implements LayoutRepository {
  constructor(private readonly storageEngine: StorageEngine) {}

  async list(): Promise<LayoutTemplate[]> {
    const store = await this.storageEngine.read()
    return store.layoutTemplates
  }

  async getById(id: string): Promise<LayoutTemplate | undefined> {
    const store = await this.storageEngine.read()
    return store.layoutTemplates.find((entry) => entry.id === id)
  }

  async create(payload: Omit<LayoutTemplate, 'id'> & Partial<Pick<LayoutTemplate, 'id'>>): Promise<LayoutTemplate> {
    return this.storageEngine.update((store) => {
      const created: LayoutTemplate = {
        ...payload,
        id: payload.id || newId('layout'),
        cells: payload.cells || [],
        meta: payload.meta || {},
        specialAreas: payload.specialAreas || []
      }
      store.layoutTemplates.push(created)
      return created
    })
  }

  async update(id: string, payload: Partial<LayoutTemplate>): Promise<LayoutTemplate | undefined> {
    return this.storageEngine.update((store) => {
      const index = store.layoutTemplates.findIndex((entry) => entry.id === id)
      if (index < 0) return undefined

      const merged = { ...store.layoutTemplates[index], ...payload, id }
      store.layoutTemplates[index] = merged
      return merged
    })
  }

  async delete(id: string): Promise<boolean> {
    return this.storageEngine.update((store) => {
      const before = store.layoutTemplates.length
      store.layoutTemplates = store.layoutTemplates.filter((entry) => entry.id !== id)
      return store.layoutTemplates.length < before
    })
  }
}
