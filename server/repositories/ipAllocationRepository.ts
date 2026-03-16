import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { IPAllocation } from '../../types/ipAllocation'
import { isValidIPv4, isIPInSubnet, isValidMacAddress } from '../utils/ipv4'
import { networkRepository } from './networkRepository'

const FILE_NAME = 'ipAllocations.json'

export const ipAllocationRepository = {
  list(networkId?: string): IPAllocation[] {
    const allocations = readJson<IPAllocation[]>(FILE_NAME)
    if (networkId) {
      return allocations.filter(a => a.network_id === networkId)
    }
    return allocations
  },

  getById(id: string): IPAllocation | null {
    const allocations = readJson<IPAllocation[]>(FILE_NAME)
    return allocations.find(a => a.id === id) || null
  },

  create(networkId: string, data: Omit<IPAllocation, 'id' | 'network_id' | 'created_at' | 'updated_at'>): IPAllocation {
    const network = networkRepository.getById(networkId)
    if (!network) {
      throw createError({ statusCode: 404, message: 'Network not found' })
    }

    if (!isValidIPv4(data.ip_address)) {
      throw createError({ statusCode: 400, message: 'Invalid IP address' })
    }

    if (!isIPInSubnet(data.ip_address, network.subnet)) {
      throw createError({ statusCode: 400, message: `IP ${data.ip_address} is not within subnet ${network.subnet}` })
    }

    if (data.mac_address && !isValidMacAddress(data.mac_address)) {
      throw createError({ statusCode: 400, message: 'Invalid MAC address format (expected XX:XX:XX:XX:XX:XX)' })
    }

    // Global IP uniqueness
    const allAllocations = readJson<IPAllocation[]>(FILE_NAME)
    if (allAllocations.some(a => a.ip_address === data.ip_address)) {
      throw createError({ statusCode: 409, message: `IP address ${data.ip_address} is already allocated` })
    }

    const now = new Date().toISOString()
    const allocation: IPAllocation = {
      id: nanoid(),
      network_id: networkId,
      ...data,
      created_at: now,
      updated_at: now
    }

    allAllocations.push(allocation)
    writeJson(FILE_NAME, allAllocations)
    return allocation
  },

  update(id: string, data: Partial<Omit<IPAllocation, 'id' | 'network_id' | 'created_at'>>): IPAllocation {
    const allocations = readJson<IPAllocation[]>(FILE_NAME)
    const index = allocations.findIndex(a => a.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'IP allocation not found' })
    }

    if (data.ip_address && data.ip_address !== allocations[index].ip_address) {
      if (!isValidIPv4(data.ip_address)) {
        throw createError({ statusCode: 400, message: 'Invalid IP address' })
      }

      const network = networkRepository.getById(allocations[index].network_id)
      if (network && !isIPInSubnet(data.ip_address, network.subnet)) {
        throw createError({ statusCode: 400, message: `IP ${data.ip_address} is not within subnet ${network.subnet}` })
      }

      if (allocations.some(a => a.ip_address === data.ip_address && a.id !== id)) {
        throw createError({ statusCode: 409, message: `IP address ${data.ip_address} is already allocated` })
      }
    }

    if (data.mac_address && !isValidMacAddress(data.mac_address)) {
      throw createError({ statusCode: 400, message: 'Invalid MAC address format' })
    }

    allocations[index] = {
      ...allocations[index],
      ...data,
      updated_at: new Date().toISOString()
    }

    writeJson(FILE_NAME, allocations)
    return allocations[index]
  },

  delete(id: string): boolean {
    const allocations = readJson<IPAllocation[]>(FILE_NAME)
    const index = allocations.findIndex(a => a.id === id)
    if (index === -1) return false

    allocations.splice(index, 1)
    writeJson(FILE_NAME, allocations)
    return true
  },

  deleteByNetworkId(networkId: string): number {
    const allocations = readJson<IPAllocation[]>(FILE_NAME)
    const filtered = allocations.filter(a => a.network_id !== networkId)
    const deleted = allocations.length - filtered.length
    writeJson(FILE_NAME, filtered)
    return deleted
  }
}
