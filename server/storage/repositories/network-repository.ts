import type { Network } from '~/types/models'
import type { StorageEngine } from '~/server/storage/interfaces/storage-engine'
import type { NetworkRepository } from '~/server/storage/interfaces/repositories'
import { newId } from '~/server/storage/shared/utils'

export class JsonNetworkRepository implements NetworkRepository {
  constructor(private readonly storageEngine: StorageEngine) {}

  async list(): Promise<Network[]> {
    const store = await this.storageEngine.read()
    return store.networks
  }

  async getById(id: string): Promise<Network | undefined> {
    const store = await this.storageEngine.read()
    return store.networks.find((entry) => entry.id === id)
  }

  async create(payload: Omit<Network, 'id'> & { id?: string }): Promise<Network> {
    return this.storageEngine.update((store) => {
      const created: Network = {
        ...payload,
        id: payload.id || newId('net'),
        tags: payload.tags || []
      }
      store.networks.push(created)
      return created
    })
  }

  async update(id: string, payload: Partial<Network>): Promise<Network | undefined> {
    return this.storageEngine.update((store) => {
      const index = store.networks.findIndex((entry) => entry.id === id)
      if (index < 0) return undefined
      const current = store.networks[index]
      const merged: Network = {
        ...current,
        ...payload,
        id: current.id,
        tags: payload.tags ?? current.tags ?? []
      }
      store.networks[index] = merged
      return merged
    })
  }

  async delete(id: string): Promise<boolean> {
    return this.storageEngine.update((store) => {
      const before = store.networks.length
      store.networks = store.networks.filter((entry) => entry.id !== id)
      store.ipAllocations = store.ipAllocations.filter((entry) => entry.networkId !== id)
      return store.networks.length < before
    })
  }
}
