import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { IPAllocation } from '../../types/ipAllocation'
import { isValidIPv4, isIPInSubnet, isUsableHostIP, isValidMacAddress, subnetRangeError, parseSubnet, ipToLong } from '../utils/ipv4'

interface AllocationRow {
  id: string
  network_id: string
  ip_address: string
  hostname: string | null
  mac_address: string | null
  device_type: string | null
  description: string | null
  status: string
  created_at: string
  updated_at: string
}

type IPAllocationUpdateInput = Partial<Omit<IPAllocation, 'id' | 'created_at'>>

function rowToAllocation(row: AllocationRow): IPAllocation {
  return {
    id: row.id,
    network_id: row.network_id,
    ip_address: row.ip_address,
    hostname: row.hostname ?? undefined,
    mac_address: row.mac_address ?? undefined,
    device_type: row.device_type as IPAllocation['device_type'] | undefined,
    description: row.description ?? undefined,
    status: row.status as IPAllocation['status'],
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

async function assertDhcpRangeFree(networkId: string, ip: string): Promise<void> {
  const ranges = await prisma.ipRange.findMany({ where: { network_id: networkId, type: 'dhcp' } })
  const ipLong = ipToLong(ip)
  for (const range of ranges) {
    if (ipLong >= ipToLong(range.start_ip) && ipLong <= ipToLong(range.end_ip)) {
      throw createError({
        statusCode: 400,
        message: `IP ${ip} is inside a DHCP dynamic range (${range.start_ip} - ${range.end_ip}). Static IPs cannot be assigned within dynamic DHCP ranges.`
      })
    }
  }
}

export const ipAllocationRepository = {
  async list(networkId?: string): Promise<IPAllocation[]> {
    const rows = await prisma.ipAllocation.findMany({
      where: networkId ? { network_id: networkId } : undefined,
      orderBy: [{ network_id: 'asc' }, { ip_address: 'asc' }]
    })
    return rows.map(rowToAllocation)
  },

  async getById(id: string): Promise<IPAllocation | null> {
    const row = await prisma.ipAllocation.findUnique({ where: { id } })
    return row ? rowToAllocation(row) : null
  },

  async create(networkId: string, data: Omit<IPAllocation, 'id' | 'network_id' | 'created_at' | 'updated_at'>): Promise<IPAllocation> {
    const network = await prisma.network.findUnique({ where: { id: networkId } })
    if (!network) {
      throw createError({ statusCode: 404, message: 'Network not found' })
    }

    if (!isValidIPv4(data.ip_address)) {
      throw createError({ statusCode: 400, message: 'Invalid IP address' })
    }

    if (!isUsableHostIP(data.ip_address, network.subnet)) {
      const info = parseSubnet(network.subnet)
      if (!isIPInSubnet(data.ip_address, network.subnet)) {
        throw createError({ statusCode: 400, message: subnetRangeError(data.ip_address, network.subnet) })
      }
      throw createError({
        statusCode: 400,
        message: `IP ${data.ip_address} is the ${data.ip_address === info.network_address ? 'network' : 'broadcast'} address of ${network.subnet}. Valid range: ${info.first_usable} - ${info.last_usable}`
      })
    }

    if (data.mac_address && !isValidMacAddress(data.mac_address)) {
      throw createError({ statusCode: 400, message: 'Invalid MAC address format (expected XX:XX:XX:XX:XX:XX)' })
    }

    await assertDhcpRangeFree(networkId, data.ip_address)

    const clash = await prisma.ipAllocation.findFirst({ where: { ip_address: data.ip_address } })
    if (clash) {
      throw createError({ statusCode: 409, message: `IP address ${data.ip_address} is already allocated` })
    }

    const now = new Date().toISOString()
    const row = await prisma.ipAllocation.create({
      data: {
        id: randomUUID(),
        network_id: networkId,
        ip_address: data.ip_address,
        hostname: data.hostname ?? null,
        mac_address: data.mac_address ?? null,
        device_type: data.device_type ?? null,
        description: data.description ?? null,
        status: data.status,
        created_at: now,
        updated_at: now
      }
    })
    return rowToAllocation(row)
  },

  async update(id: string, data: IPAllocationUpdateInput): Promise<IPAllocation> {
    const current = await prisma.ipAllocation.findUnique({ where: { id } })
    if (!current) {
      throw createError({ statusCode: 404, message: 'IP allocation not found' })
    }

    const currentNetwork = await prisma.network.findUnique({ where: { id: current.network_id } })
    const targetNetworkId = data.network_id ?? current.network_id
    const targetNetwork = await prisma.network.findUnique({ where: { id: targetNetworkId } })

    if (!currentNetwork || !targetNetwork) {
      throw createError({ statusCode: 404, message: 'Network not found' })
    }

    if (data.network_id && targetNetwork.site_id !== currentNetwork.site_id) {
      throw createError({ statusCode: 400, message: 'Cross-site network moves are not allowed' })
    }

    const nextIp = data.ip_address ?? current.ip_address
    const shouldValidateIp = data.network_id !== undefined || data.ip_address !== undefined

    if (shouldValidateIp) {
      if (!isValidIPv4(nextIp)) {
        throw createError({ statusCode: 400, message: 'Invalid IP address' })
      }

      if (!isUsableHostIP(nextIp, targetNetwork.subnet)) {
        const info = parseSubnet(targetNetwork.subnet)
        if (!isIPInSubnet(nextIp, targetNetwork.subnet)) {
          if (!data.network_id) {
            const candidates = await prisma.network.findMany({
              where: { site_id: currentNetwork.site_id }
            })
            const matchingCandidates = candidates
              .filter(network => network.id !== currentNetwork.id && isUsableHostIP(nextIp, network.subnet))
              .map(network => ({ id: network.id, name: network.name, subnet: network.subnet }))

            if (matchingCandidates.length > 0) {
              throw createError({
                statusCode: 409,
                statusMessage: 'IP belongs to another network',
                data: {
                  code: 'IP_NETWORK_MOVE_REQUIRED',
                  candidates: matchingCandidates
                }
              })
            }
          }

          throw createError({ statusCode: 400, message: subnetRangeError(nextIp, targetNetwork.subnet) })
        }
        throw createError({
          statusCode: 400,
          message: `IP ${nextIp} is the ${nextIp === info.network_address ? 'network' : 'broadcast'} address of ${targetNetwork.subnet}. Valid range: ${info.first_usable} - ${info.last_usable}`
        })
      }

      await assertDhcpRangeFree(targetNetwork.id, nextIp)

      const clash = await prisma.ipAllocation.findFirst({
        where: { ip_address: nextIp, NOT: { id } }
      })
      if (clash) {
        throw createError({ statusCode: 409, message: `IP address ${nextIp} is already allocated` })
      }
    }

    if (data.mac_address && !isValidMacAddress(data.mac_address)) {
      throw createError({ statusCode: 400, message: 'Invalid MAC address format' })
    }

    const row = await prisma.ipAllocation.update({
      where: { id },
      data: {
        ...(data.network_id !== undefined ? { network_id: data.network_id } : {}),
        ...(data.ip_address !== undefined ? { ip_address: data.ip_address } : {}),
        ...(data.hostname !== undefined ? { hostname: data.hostname ?? null } : {}),
        ...(data.mac_address !== undefined ? { mac_address: data.mac_address ?? null } : {}),
        ...(data.device_type !== undefined ? { device_type: data.device_type ?? null } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        updated_at: new Date().toISOString()
      }
    })
    return rowToAllocation(row)
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.ipAllocation.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  },

  async deleteByNetworkId(networkId: string): Promise<number> {
    const result = await prisma.ipAllocation.deleteMany({ where: { network_id: networkId } })
    return result.count
  }
}
