import type { IpAllocation, IpRange, Network } from '~/types/models'
import { ipInSubnet, ipToNumber, isValidIpv4, prefixToNetmask } from '~/utils/ip'
import { dataStore } from '../data-store'

export const networkRepository = {
  async list(): Promise<Network[]> {
    const data = await dataStore.read()
    return data.networks.sort((a, b) => a.vlanId - b.vlanId)
  },
  async byId(id: string) {
    return (await this.list()).find((item) => item.id === id)
  },
  async create(payload: Omit<Network, 'id' | 'netmask'>) {
    const data = await dataStore.read()
    const created: Network = {
      ...payload,
      id: dataStore.nextId('net'),
      netmask: prefixToNetmask(payload.prefix)
    }
    data.networks.push(created)
    await dataStore.write(data)
    return created
  },
  async update(id: string, payload: Partial<Omit<Network, 'id' | 'netmask'>>) {
    const data = await dataStore.read()
    const index = data.networks.findIndex((item) => item.id === id)
    if (index === -1) {
      return undefined
    }

    const merged = { ...data.networks[index], ...payload }
    merged.netmask = prefixToNetmask(merged.prefix)
    data.networks[index] = merged
    await dataStore.write(data)
    return merged
  },
  async delete(id: string) {
    const data = await dataStore.read()
    const lengthBefore = data.networks.length
    data.networks = data.networks.filter((item) => item.id !== id)
    data.ipAllocations = data.ipAllocations.filter((item) => item.networkId !== id)
    data.ipRanges = data.ipRanges.filter((item) => item.networkId !== id)
    if (lengthBefore === data.networks.length) {
      return false
    }

    await dataStore.write(data)
    return true
  },
  async allocations(networkId: string): Promise<IpAllocation[]> {
    const data = await dataStore.read()
    return data.ipAllocations.filter((item) => item.networkId === networkId)
  },
  async createAllocation(payload: Omit<IpAllocation, 'id'>) {
    const data = await dataStore.read()
    const network = data.networks.find((item) => item.id === payload.networkId)
    if (!network || !isValidIpv4(payload.ipAddress) || !ipInSubnet(payload.ipAddress, network.subnet, network.prefix)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid IP allocation subnet relation' })
    }

    const duplicate = data.ipAllocations.some((item) => item.networkId === payload.networkId && item.ipAddress === payload.ipAddress)
    if (duplicate) {
      throw createError({ statusCode: 400, statusMessage: 'Duplicate IP in network' })
    }

    const created = { ...payload, id: dataStore.nextId('alloc') }
    data.ipAllocations.push(created)
    await dataStore.write(data)
    return created
  },
  async updateAllocation(id: string, payload: Partial<Omit<IpAllocation, 'id'>>) {
    const data = await dataStore.read()
    const index = data.ipAllocations.findIndex((item) => item.id === id)
    if (index === -1) {
      return undefined
    }

    const merged = { ...data.ipAllocations[index], ...payload }
    const network = data.networks.find((item) => item.id === merged.networkId)
    if (!network || !isValidIpv4(merged.ipAddress) || !ipInSubnet(merged.ipAddress, network.subnet, network.prefix)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid IP allocation update' })
    }

    const duplicate = data.ipAllocations.some((item) => item.id !== id && item.networkId === merged.networkId && item.ipAddress === merged.ipAddress)
    if (duplicate) {
      throw createError({ statusCode: 400, statusMessage: 'Duplicate IP in network' })
    }

    data.ipAllocations[index] = merged
    await dataStore.write(data)
    return merged
  },
  async deleteAllocation(id: string) {
    const data = await dataStore.read()
    const before = data.ipAllocations.length
    data.ipAllocations = data.ipAllocations.filter((item) => item.id !== id)
    await dataStore.write(data)
    return before !== data.ipAllocations.length
  },
  async ranges(networkId: string): Promise<IpRange[]> {
    const data = await dataStore.read()
    return data.ipRanges.filter((item) => item.networkId === networkId)
  },
  async createRange(payload: Omit<IpRange, 'id'>) {
    const data = await dataStore.read()
    const network = data.networks.find((item) => item.id === payload.networkId)
    if (!network) {
      throw createError({ statusCode: 404, statusMessage: 'Network not found' })
    }

    this.validateRange(payload.startIp, payload.endIp, network.subnet, network.prefix)
    const created = { ...payload, id: dataStore.nextId('range') }
    data.ipRanges.push(created)
    await dataStore.write(data)
    return created
  },
  async updateRange(id: string, payload: Partial<Omit<IpRange, 'id'>>) {
    const data = await dataStore.read()
    const index = data.ipRanges.findIndex((item) => item.id === id)
    if (index === -1) {
      return undefined
    }

    const merged = { ...data.ipRanges[index], ...payload }
    const network = data.networks.find((item) => item.id === merged.networkId)
    if (!network) {
      throw createError({ statusCode: 404, statusMessage: 'Network not found' })
    }

    this.validateRange(merged.startIp, merged.endIp, network.subnet, network.prefix)
    data.ipRanges[index] = merged
    await dataStore.write(data)
    return merged
  },
  async deleteRange(id: string) {
    const data = await dataStore.read()
    const before = data.ipRanges.length
    data.ipRanges = data.ipRanges.filter((item) => item.id !== id)
    await dataStore.write(data)
    return before !== data.ipRanges.length
  },
  validateRange(startIp: string, endIp: string, subnet: string, prefix: number) {
    if (!isValidIpv4(startIp) || !isValidIpv4(endIp)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid IPv4 in range' })
    }

    if (!ipInSubnet(startIp, subnet, prefix) || !ipInSubnet(endIp, subnet, prefix)) {
      throw createError({ statusCode: 400, statusMessage: 'Range out of subnet' })
    }

    if (ipToNumber(startIp) > ipToNumber(endIp)) {
      throw createError({ statusCode: 400, statusMessage: 'startIp must be <= endIp' })
    }
  }
}
