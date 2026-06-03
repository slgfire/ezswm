import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { IPRange } from '../../types/ipRange'
import { isValidIPv4, isIPInSubnet, ipToLong, doRangesOverlap, subnetRangeError } from '../utils/ipv4'

interface RangeRow {
  id: string
  network_id: string
  start_ip: string
  end_ip: string
  type: string
  description: string | null
  created_at: string
  updated_at: string
}

function rowToRange(row: RangeRow): IPRange {
  return {
    id: row.id,
    network_id: row.network_id,
    start_ip: row.start_ip,
    end_ip: row.end_ip,
    type: row.type as IPRange['type'],
    description: row.description ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export const ipRangeRepository = {
  async list(networkId?: string): Promise<IPRange[]> {
    const rows = await prisma.ipRange.findMany({
      where: networkId ? { network_id: networkId } : undefined,
      orderBy: [{ network_id: 'asc' }, { start_ip: 'asc' }]
    })
    return rows.map(rowToRange)
  },

  async getById(id: string): Promise<IPRange | null> {
    const row = await prisma.ipRange.findUnique({ where: { id } })
    return row ? rowToRange(row) : null
  },

  async create(networkId: string, data: Omit<IPRange, 'id' | 'network_id' | 'created_at' | 'updated_at'>): Promise<IPRange> {
    const network = await prisma.network.findUnique({ where: { id: networkId } })
    if (!network) {
      throw createError({ statusCode: 404, message: 'Network not found' })
    }

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

    const existing = await prisma.ipRange.findMany({ where: { network_id: networkId } })
    for (const r of existing) {
      if (doRangesOverlap(data.start_ip, data.end_ip, r.start_ip, r.end_ip)) {
        throw createError({
          statusCode: 409,
          message: `Range ${data.start_ip}-${data.end_ip} overlaps with existing range ${r.start_ip}-${r.end_ip} (${r.type})`
        })
      }
    }

    const now = new Date().toISOString()
    const row = await prisma.ipRange.create({
      data: {
        id: randomUUID(),
        network_id: networkId,
        start_ip: data.start_ip,
        end_ip: data.end_ip,
        type: data.type,
        description: data.description ?? null,
        created_at: now,
        updated_at: now
      }
    })
    return rowToRange(row)
  },

  async update(id: string, data: Partial<Omit<IPRange, 'id' | 'network_id' | 'created_at'>>): Promise<IPRange> {
    const current = await prisma.ipRange.findUnique({ where: { id } })
    if (!current) {
      throw createError({ statusCode: 404, message: 'IP range not found' })
    }

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

    const network = await prisma.network.findUnique({ where: { id: current.network_id } })
    if (network) {
      if (!isIPInSubnet(startIp, network.subnet)) {
        throw createError({ statusCode: 400, message: subnetRangeError(startIp, network.subnet) })
      }
      if (!isIPInSubnet(endIp, network.subnet)) {
        throw createError({ statusCode: 400, message: subnetRangeError(endIp, network.subnet) })
      }
    }

    const networkRanges = await prisma.ipRange.findMany({
      where: { network_id: current.network_id, NOT: { id } }
    })
    for (const r of networkRanges) {
      if (doRangesOverlap(startIp, endIp, r.start_ip, r.end_ip)) {
        throw createError({
          statusCode: 409,
          message: `Range ${startIp}-${endIp} overlaps with existing range ${r.start_ip}-${r.end_ip} (${r.type})`
        })
      }
    }

    const row = await prisma.ipRange.update({
      where: { id },
      data: {
        ...(data.start_ip !== undefined ? { start_ip: data.start_ip } : {}),
        ...(data.end_ip !== undefined ? { end_ip: data.end_ip } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        updated_at: new Date().toISOString()
      }
    })
    return rowToRange(row)
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.ipRange.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  },

  async deleteByNetworkId(networkId: string): Promise<number> {
    const result = await prisma.ipRange.deleteMany({ where: { network_id: networkId } })
    return result.count
  }
}
