import type { IpRange } from '~/types/models'
import type { StorageEngine } from '~/server/storage/interfaces/storage-engine'
import type { IpRangeRepository } from '~/server/storage/interfaces/repositories'
import { newId } from '~/server/storage/shared/utils'

export class JsonIpRangeRepository implements IpRangeRepository {
  constructor(private readonly storageEngine: StorageEngine) {}

  async list(): Promise<IpRange[]> {
    const store = await this.storageEngine.read()
    return store.ipRanges
  }

  async listByNetwork(networkId: string): Promise<IpRange[]> {
    const store = await this.storageEngine.read()
    return store.ipRanges.filter((entry) => entry.networkId === networkId)
  }

  async getById(id: string): Promise<IpRange | undefined> {
    const store = await this.storageEngine.read()
    return store.ipRanges.find((entry) => entry.id === id)
  }

  async create(payload: Omit<IpRange, 'id'> & { id?: string }): Promise<IpRange> {
    return this.storageEngine.update((store) => {
      const created: IpRange = {
        ...payload,
        id: payload.id || newId('range')
      }
      store.ipRanges.push(created)
      return created
    })
  }

  async update(id: string, payload: Partial<IpRange>): Promise<IpRange | undefined> {
    return this.storageEngine.update((store) => {
      const index = store.ipRanges.findIndex((entry) => entry.id === id)
      if (index < 0) return undefined

      const current = store.ipRanges[index]
      const merged: IpRange = {
        ...current,
        ...payload,
        id: current.id,
        networkId: payload.networkId || current.networkId
      }

      store.ipRanges[index] = merged
      return merged
    })
  }

  async delete(id: string): Promise<boolean> {
    return this.storageEngine.update((store) => {
      const before = store.ipRanges.length
      store.ipRanges = store.ipRanges.filter((entry) => entry.id !== id)
      return store.ipRanges.length < before
    })
  }
}
