import type { Rack } from '~/types/models'
import type { RackRepository } from '~/server/storage/interfaces/repositories'
import type { StorageEngine } from '~/server/storage/interfaces/storage-engine'
import { compareNames, newId } from '~/server/storage/shared/utils'

export class JsonRackRepository implements RackRepository {
  constructor(private readonly storageEngine: StorageEngine) {}

  async list(): Promise<Rack[]> {
    const store = await this.storageEngine.read()
    return store.racks
  }

  async listByLocation(locationId: string): Promise<Rack[]> {
    const store = await this.storageEngine.read()
    return store.racks.filter((entry) => entry.locationId === locationId)
  }

  async getById(id: string): Promise<Rack | undefined> {
    const store = await this.storageEngine.read()
    return store.racks.find((entry) => entry.id === id)
  }

  async getByNameInLocation(locationId: string, name: string): Promise<Rack | undefined> {
    const store = await this.storageEngine.read()
    return store.racks.find((entry) => entry.locationId === locationId && compareNames(entry.name, name))
  }

  async create(payload: Omit<Rack, 'id'> & Partial<Pick<Rack, 'id'>>): Promise<Rack> {
    return this.storageEngine.update((store) => {
      const created: Rack = {
        ...payload,
        id: payload.id || newId('rack')
      }
      store.racks.push(created)
      return created
    })
  }

  async update(id: string, payload: Partial<Rack>): Promise<Rack | undefined> {
    return this.storageEngine.update((store) => {
      const index = store.racks.findIndex((entry) => entry.id === id)
      if (index < 0) return undefined
      const merged = { ...store.racks[index], ...payload, id }
      store.racks[index] = merged
      return merged
    })
  }

  async delete(id: string): Promise<boolean> {
    return this.storageEngine.update((store) => {
      const before = store.racks.length
      store.racks = store.racks.filter((entry) => entry.id !== id)
      return store.racks.length < before
    })
  }
}
