import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { IPRange } from '../../types/ipRange'
import { isValidIPv4, isIPInSubnet, ipToLong, doRangesOverlap, subnetRangeError } from '../utils/ipv4'
import { networkRepository } from './networkRepository'

const FILE_NAME = 'ipRanges.json'

export const ipRangeRepository = {
  list(networkId?: string): IPRange[] {
    const ranges = readJson<IPRange[]>(FILE_NAME)
    if (networkId) {
      return ranges.filter(r => r.network_id === networkId)
    }
    return ranges
  },

  getById(id: string): IPRange | null {
    const ranges = readJson<IPRange[]>(FILE_NAME)
    return ranges.find(r => r.id === id) || null
  },

  create(networkId: string, data: Omit<IPRange, 'id' | 'network_id' | 'created_at' | 'updated_at'>): IPRange {
    const network = networkRepository.getById(networkId)
    if (!network) {
      throw createError({ statusCode: 404, message: 'Network not found' })
    }

    // Block DHCP ranges for /31 and /32 networks
    const prefix = parseInt(network.subnet.split('/')[1] || '0', 10)
    if (prefix >= 31 && data.type === 'dhcp') {
      const msg = prefix === 32
        ? 'DHCP is not applicable for host-route networks.'
        : 'DHCP is not applicable for point-to-point networks.'
      throw createError({ statusCode: 400, message: msg })
    }

    if (!isValidIPv4(data.start_ip) || !isValidIPv4(data.end_ip)) {
      throw createError({ statusCode: 400, message: 'Invalid IP address in range' })
    }

    if (ipToLong(data.start_ip) > ipToLong(data.end_ip)) {
      throw createError({ statusCode: 400, message: 'Start IP must be less than or equal to end IP' })
    }

    if (!isIPInSubnet(data.start_ip, network.subnet)) {
      throw createError({ statusCode: 400, message: subnetRangeError(data.start_ip, network.subnet) })
    }
    if (!isIPInSubnet(data.end_ip, network.subnet)) {
      throw createError({ statusCode: 400, message: subnetRangeError(data.end_ip, network.subnet) })
    }

    // Check overlap with existing ranges in the same network
    const existingRanges = this.list(networkId)
    for (const existing of existingRanges) {
      if (doRangesOverlap(data.start_ip, data.end_ip, existing.start_ip, existing.end_ip)) {
        throw createError({ statusCode: 409, message: `Range ${data.start_ip}-${data.end_ip} overlaps with existing range ${existing.start_ip}-${existing.end_ip} (${existing.type})` })
      }
    }

    const ranges = readJson<IPRange[]>(FILE_NAME)
    const now = new Date().toISOString()
    const range: IPRange = {
      id: nanoid(),
      network_id: networkId,
      ...data,
      created_at: now,
      updated_at: now
    }

    ranges.push(range)
    writeJson(FILE_NAME, ranges)
    return range
  },

  update(id: string, data: Partial<Omit<IPRange, 'id' | 'network_id' | 'created_at'>>): IPRange {
    const ranges = readJson<IPRange[]>(FILE_NAME)
    const index = ranges.findIndex(r => r.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'IP range not found' })
    }

    const current = ranges[index]!
    const startIp = data.start_ip || current.start_ip
    const endIp = data.end_ip || current.end_ip

    if (data.start_ip && !isValidIPv4(data.start_ip)) {
      throw createError({ statusCode: 400, message: 'Invalid start IP' })
    }
    if (data.end_ip && !isValidIPv4(data.end_ip)) {
      throw createError({ statusCode: 400, message: 'Invalid end IP' })
    }

    if (ipToLong(startIp) > ipToLong(endIp)) {
      throw createError({ statusCode: 400, message: 'Start IP must be less than or equal to end IP' })
    }

    const network = networkRepository.getById(current.network_id)
    if (network) {
      if (!isIPInSubnet(startIp, network.subnet)) {
        throw createError({ statusCode: 400, message: subnetRangeError(startIp, network.subnet) })
      }
      if (!isIPInSubnet(endIp, network.subnet)) {
        throw createError({ statusCode: 400, message: subnetRangeError(endIp, network.subnet) })
      }
    }

    // Check overlap excluding self
    const networkRanges = ranges.filter(r => r.network_id === current.network_id && r.id !== id)
    for (const existing of networkRanges) {
      if (doRangesOverlap(startIp, endIp, existing.start_ip, existing.end_ip)) {
        throw createError({ statusCode: 409, message: `Range ${startIp}-${endIp} overlaps with existing range ${existing.start_ip}-${existing.end_ip} (${existing.type})` })
      }
    }

    ranges[index] = {
      ...current,
      ...data,
      updated_at: new Date().toISOString()
    } as IPRange

    writeJson(FILE_NAME, ranges)
    return ranges[index]!
  },

  delete(id: string): boolean {
    const ranges = readJson<IPRange[]>(FILE_NAME)
    const index = ranges.findIndex(r => r.id === id)
    if (index === -1) return false

    ranges.splice(index, 1)
    writeJson(FILE_NAME, ranges)
    return true
  },

  deleteByNetworkId(networkId: string): number {
    const ranges = readJson<IPRange[]>(FILE_NAME)
    const filtered = ranges.filter(r => r.network_id !== networkId)
    const deleted = ranges.length - filtered.length
    writeJson(FILE_NAME, filtered)
    return deleted
  }
}
