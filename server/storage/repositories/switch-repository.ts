import type { Switch } from '~/types/models'
import type { StorageEngine } from '~/server/storage/interfaces/storage-engine'
import type { SwitchRepository } from '~/server/storage/interfaces/repositories'
import { newId, withTimestamps } from '~/server/storage/shared/utils'

export class JsonSwitchRepository implements SwitchRepository {
  constructor(private readonly storageEngine: StorageEngine) {}

  private normalizePort(switchId: string, port: Switch['ports'][number] & Record<string, unknown>): Switch['ports'][number] {
    const connectedDevice = typeof port.connectedDevice === 'string'
      ? port.connectedDevice
      : typeof port.hostname === 'string'
        ? port.hostname
        : typeof port.device === 'string'
          ? port.device
          : undefined
    const macAddress = typeof port.macAddress === 'string'
      ? port.macAddress
      : typeof port.mac === 'string'
        ? port.mac
        : undefined
    const patchTarget = typeof port.patchTarget === 'string'
      ? port.patchTarget
      : typeof port.patch_target === 'string'
        ? port.patch_target
        : undefined

    return {
      ...port,
      switchId,
      connectedDevice,
      macAddress,
      patchTarget,
      duplex: port.duplex === 'full' || port.duplex === 'half' || port.duplex === 'auto' ? port.duplex : 'auto'
    }
  }

  private normalizeSwitch(entry: Switch): Switch {
    return {
      ...entry,
      ports: entry.ports.map((port) => this.normalizePort(entry.id, port as Switch['ports'][number] & Record<string, unknown>))
    }
  }

  async list(): Promise<Switch[]> {
    const store = await this.storageEngine.read()
    return store.switches.map((entry) => this.normalizeSwitch(entry))
  }

  async getById(id: string): Promise<Switch | undefined> {
    const store = await this.storageEngine.read()
    const entry = store.switches.find((switchEntry) => switchEntry.id === id)
    return entry ? this.normalizeSwitch(entry) : undefined
  }

  async create(payload: Omit<Switch, 'id'> & Partial<Pick<Switch, 'id'>>): Promise<Switch> {
    return this.storageEngine.update((store) => {
      const id = payload.id || newId('sw')
      const ports = payload.ports?.length
        ? payload.ports.map((port) => this.normalizePort(id, { ...port, switchId: id } as Switch['ports'][number] & Record<string, unknown>))
        : Array.from({ length: payload.portCount }, (_, index) => ({ switchId: id, portNumber: index + 1, status: 'free' as const, mediaType: 'RJ45' as const, duplex: 'auto' as const }))

      const created = withTimestamps(undefined, {
        ...payload,
        id,
        ports,
        tags: payload.tags || [],
        status: payload.status || 'planned'
      })

      store.switches.push(created)
      return created
    })
  }

  async update(id: string, payload: Partial<Switch>): Promise<Switch | undefined> {
    return this.storageEngine.update((store) => {
      const index = store.switches.findIndex((entry) => entry.id === id)
      if (index < 0) return undefined

      const current = store.switches[index]
      const merged = withTimestamps(current, {
        ...current,
        ...payload,
        id: current.id,
        ports: (payload.ports || current.ports).map((port) => this.normalizePort(current.id, { ...port, switchId: current.id } as Switch['ports'][number] & Record<string, unknown>))
      })
      store.switches[index] = merged
      return merged
    })
  }

  async delete(id: string): Promise<boolean> {
    return this.storageEngine.update((store) => {
      const before = store.switches.length
      store.switches = store.switches.filter((entry) => entry.id !== id)
      return store.switches.length < before
    })
  }

  async updatePort(switchId: string, portNumber: number, payload: Partial<Switch['ports'][number]>): Promise<Switch['ports'][number] | undefined> {
    return this.storageEngine.update((store) => {
      const switchEntry = store.switches.find((entry) => entry.id === switchId)
      if (!switchEntry) return undefined

      const portIndex = switchEntry.ports.findIndex((port) => port.portNumber === portNumber)
      if (portIndex < 0) return undefined

      const current = switchEntry.ports[portIndex]
      const updatedPort = {
        ...current,
        ...payload,
        switchId,
        portNumber,
        duplex: payload.duplex === 'full' || payload.duplex === 'half' || payload.duplex === 'auto'
          ? payload.duplex
          : current.duplex || 'auto'
      }

      switchEntry.ports[portIndex] = updatedPort
      switchEntry.updatedAt = new Date().toISOString()
      return updatedPort
    })
  }
}
