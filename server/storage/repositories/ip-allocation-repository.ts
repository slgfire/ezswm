import type { IpAllocation } from '~/types/models'
import type { StorageEngine } from '~/server/storage/interfaces/storage-engine'
import type { IpAllocationRepository } from '~/server/storage/interfaces/repositories'
import { newId } from '~/server/storage/shared/utils'

export class JsonIpAllocationRepository implements IpAllocationRepository {
  constructor(private readonly storageEngine: StorageEngine) {}

  async list(): Promise<IpAllocation[]> {
    const store = await this.storageEngine.read()
    return store.ipAllocations
  }

  async listByNetwork(networkId: string): Promise<IpAllocation[]> {
    const store = await this.storageEngine.read()
    return store.ipAllocations.filter((entry) => entry.networkId === networkId)
  }

  async getById(id: string): Promise<IpAllocation | undefined> {
    const store = await this.storageEngine.read()
    return store.ipAllocations.find((entry) => entry.id === id)
  }

  async create(payload: Omit<IpAllocation, 'id'> & { id?: string }): Promise<IpAllocation> {
    return this.storageEngine.update((store) => {
      const created: IpAllocation = {
        ...payload,
        id: payload.id || newId('ip')
      }
      store.ipAllocations.push(created)
      return created
    })
  }

  async update(id: string, payload: Partial<IpAllocation>): Promise<IpAllocation | undefined> {
    return this.storageEngine.update((store) => {
      const index = store.ipAllocations.findIndex((entry) => entry.id === id)
      if (index < 0) return undefined
      const current = store.ipAllocations[index]
      const merged: IpAllocation = {
        ...current,
        ...payload,
        id: current.id,
        networkId: payload.networkId || current.networkId
      }
      store.ipAllocations[index] = merged
      return merged
    })
  }

  async delete(id: string): Promise<boolean> {
    return this.storageEngine.update((store) => {
      const before = store.ipAllocations.length
      store.ipAllocations = store.ipAllocations.filter((entry) => entry.id !== id)
      return store.ipAllocations.length < before
    })
  }
}
