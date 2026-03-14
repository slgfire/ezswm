import type { AppSettings, IpAllocation, IpRange, LayoutTemplate, Network, Port, Switch } from '~/types/models'
import { ipInSubnet, ipToNumber, isIPv4, prefixToNetmask, rangesOverlap } from '~/utils/ip'
import { BaseRepository } from './baseRepository'
import { getStores } from '../storage/stores'

const stores = getStores()

export class SwitchRepository extends BaseRepository<Switch> {
  constructor() { super(stores.switches) }
}

export class PortRepository extends BaseRepository<Port> {
  constructor() { super(stores.ports) }

  async bySwitch(switchId: string) {
    const ports = await this.findAll()
    return ports.filter(port => port.switchId === switchId)
  }
}

export class LayoutRepository extends BaseRepository<LayoutTemplate> {
  constructor() { super(stores.layouts) }
}

export class NetworkRepository extends BaseRepository<Network> {
  constructor() { super(stores.networks) }

  async create(payload: Omit<Network, 'id' | 'netmask'> & { id?: string }) {
    return super.create({ ...payload, netmask: prefixToNetmask(payload.prefix) })
  }

  async update(id: string, payload: Partial<Network>) {
    const next = { ...payload }
    if (typeof payload.prefix === 'number') {
      next.netmask = prefixToNetmask(payload.prefix)
    }
    return super.update(id, next)
  }
}

export class AllocationRepository extends BaseRepository<IpAllocation> {
  constructor() { super(stores.allocations) }

  async byNetwork(networkId: string) {
    const allocations = await this.findAll()
    return allocations.filter(item => item.networkId === networkId)
  }

  async validate(payload: IpAllocation, network: Network, currentId?: string) {
    if (!isIPv4(payload.ipAddress)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid IPv4 address' })
    }
    if (!ipInSubnet(payload.ipAddress, network.subnet, network.prefix)) {
      throw createError({ statusCode: 400, statusMessage: 'IP outside subnet' })
    }

    const allocations = await this.byNetwork(network.id)
    const duplicate = allocations.find(a => a.ipAddress === payload.ipAddress && a.id !== currentId)
    if (duplicate) {
      throw createError({ statusCode: 400, statusMessage: 'Duplicate IP in network' })
    }
  }
}

export class RangeRepository extends BaseRepository<IpRange> {
  constructor() { super(stores.ranges) }

  async byNetwork(networkId: string) {
    const ranges = await this.findAll()
    return ranges.filter(item => item.networkId === networkId)
  }

  async validate(payload: IpRange, network: Network, currentId?: string) {
    if (!isIPv4(payload.startIp) || !isIPv4(payload.endIp)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid IPv4 in range' })
    }
    if (!ipInSubnet(payload.startIp, network.subnet, network.prefix) || !ipInSubnet(payload.endIp, network.subnet, network.prefix)) {
      throw createError({ statusCode: 400, statusMessage: 'Range outside subnet' })
    }
    if (ipToNumber(payload.startIp) > ipToNumber(payload.endIp)) {
      throw createError({ statusCode: 400, statusMessage: 'startIp must be <= endIp' })
    }

    const ranges = await this.byNetwork(network.id)
    const invalidOverlap = ranges.find(range => range.id !== currentId && rangesOverlap(payload.startIp, payload.endIp, range.startIp, range.endIp))
    if (invalidOverlap) {
      throw createError({ statusCode: 400, statusMessage: 'IP range overlaps an existing range' })
    }
  }
}

export class SettingsRepository extends BaseRepository<AppSettings & { id: string }> {
  constructor() { super(stores.settings) }

  async getSingleton() {
    const all = await this.findAll()
    return all[0]
  }
}

export const repositories = {
  switches: new SwitchRepository(),
  ports: new PortRepository(),
  layouts: new LayoutRepository(),
  networks: new NetworkRepository(),
  allocations: new AllocationRepository(),
  ranges: new RangeRepository(),
  settings: new SettingsRepository()
}
