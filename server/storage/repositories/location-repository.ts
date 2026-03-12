import type { Location } from '~/types/models'
import type { LocationRepository } from '~/server/storage/interfaces/repositories'
import type { StorageEngine } from '~/server/storage/interfaces/storage-engine'
import { compareNames, newId } from '~/server/storage/shared/utils'

export class JsonLocationRepository implements LocationRepository {
  constructor(private readonly storageEngine: StorageEngine) {}

  async list(): Promise<Location[]> {
    const store = await this.storageEngine.read()
    return store.locations
  }

  async getById(id: string): Promise<Location | undefined> {
    const store = await this.storageEngine.read()
    return store.locations.find((entry) => entry.id === id)
  }

  async getByName(name: string): Promise<Location | undefined> {
    const store = await this.storageEngine.read()
    return store.locations.find((entry) => compareNames(entry.name, name))
  }

  async create(payload: Omit<Location, 'id'> & Partial<Pick<Location, 'id'>>): Promise<Location> {
    return this.storageEngine.update((store) => {
      const created: Location = {
        ...payload,
        id: payload.id || newId('loc')
      }
      store.locations.push(created)
      return created
    })
  }

  async update(id: string, payload: Partial<Location>): Promise<Location | undefined> {
    return this.storageEngine.update((store) => {
      const index = store.locations.findIndex((entry) => entry.id === id)
      if (index < 0) return undefined
      const merged = { ...store.locations[index], ...payload, id }
      store.locations[index] = merged
      return merged
    })
  }

  async delete(id: string): Promise<boolean> {
    return this.storageEngine.update((store) => {
      const before = store.locations.length
      store.locations = store.locations.filter((entry) => entry.id !== id)
      return store.locations.length < before
    })
  }
}
