import type { Port, Switch } from '~/types/models'
import { dataStore } from '../data-store'

export const switchRepository = {
  async list(): Promise<Switch[]> {
    const data = await dataStore.read()
    return data.switches
  },
  async byId(id: string): Promise<Switch | undefined> {
    return (await this.list()).find((item) => item.id === id)
  },
  async create(payload: Omit<Switch, 'id'>): Promise<Switch> {
    const data = await dataStore.read()
    const created: Switch = { ...payload, id: dataStore.nextId('sw') }
    data.switches.push(created)
    await dataStore.write(data)
    return created
  },
  async update(id: string, payload: Partial<Omit<Switch, 'id'>>): Promise<Switch | undefined> {
    const data = await dataStore.read()
    const index = data.switches.findIndex((item) => item.id === id)
    if (index === -1) {
      return undefined
    }

    data.switches[index] = { ...data.switches[index], ...payload }
    await dataStore.write(data)
    return data.switches[index]
  },
  async delete(id: string): Promise<boolean> {
    const data = await dataStore.read()
    const lengthBefore = data.switches.length
    data.switches = data.switches.filter((item) => item.id !== id)
    if (lengthBefore === data.switches.length) {
      return false
    }

    await dataStore.write(data)
    return true
  },
  async updatePort(switchId: string, portId: string, payload: Partial<Port>) {
    const data = await dataStore.read()
    const sw = data.switches.find((item) => item.id === switchId)
    if (!sw) {
      return undefined
    }

    const portIndex = sw.ports.findIndex((port) => port.id === portId)
    if (portIndex === -1) {
      return undefined
    }

    sw.ports[portIndex] = { ...sw.ports[portIndex], ...payload }
    await dataStore.write(data)
    return sw.ports[portIndex]
  }
}
