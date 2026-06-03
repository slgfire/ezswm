import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { Network } from '../../types/network'
import { isValidCIDR, isValidIPv4, isIPInSubnet } from '../utils/ipv4'

interface NetworkRow {
  id: string
  site_id: string
  name: string
  vlan_id: string | null
  subnet: string
  gateway: string | null
  dns_servers: string
  description: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

function rowToNetwork(row: NetworkRow): Network {
  return {
    id: row.id,
    site_id: row.site_id,
    name: row.name,
    vlan_id: row.vlan_id ?? undefined,
    subnet: row.subnet,
    gateway: row.gateway ?? undefined,
    dns_servers: JSON.parse(row.dns_servers) as string[],
    description: row.description ?? undefined,
    is_favorite: row.is_favorite,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function validateNetworkInputs(data: { subnet?: string; gateway?: string | null; dns_servers?: string[] }, currentSubnet?: string) {
  if (data.subnet !== undefined && !isValidCIDR(data.subnet)) {
    throw createError({ statusCode: 400, message: 'Invalid CIDR notation' })
  }
  const subnet = data.subnet ?? currentSubnet
  if (data.gateway) {
    if (!isValidIPv4(data.gateway)) {
      throw createError({ statusCode: 400, message: 'Invalid gateway IP address' })
    }
    if (subnet && !isIPInSubnet(data.gateway, subnet)) {
      throw createError({ statusCode: 400, message: 'Gateway is not within the subnet' })
    }
  }
  if (data.dns_servers) {
    for (const dns of data.dns_servers) {
      if (!isValidIPv4(dns)) {
        throw createError({ statusCode: 400, message: `Invalid DNS server IP: ${dns}` })
      }
    }
  }
}

export const networkRepository = {
  async list(siteId?: string): Promise<Network[]> {
    const rows = await prisma.network.findMany({
      where: siteId ? { site_id: siteId } : undefined,
      orderBy: [{ site_id: 'asc' }, { name: 'asc' }]
    })
    return rows.map(rowToNetwork)
  },

  async getById(id: string): Promise<Network | null> {
    const row = await prisma.network.findUnique({ where: { id } })
    return row ? rowToNetwork(row) : null
  },

  async create(data: Omit<Network, 'id' | 'created_at' | 'updated_at' | 'is_favorite'>): Promise<Network> {
    validateNetworkInputs(data)

    const now = new Date().toISOString()
    const row = await prisma.network.create({
      data: {
        id: randomUUID(),
        site_id: data.site_id,
        name: data.name,
        vlan_id: data.vlan_id ?? null,
        subnet: data.subnet,
        gateway: data.gateway ?? null,
        dns_servers: JSON.stringify(data.dns_servers ?? []),
        description: data.description ?? null,
        is_favorite: false,
        created_at: now,
        updated_at: now
      }
    })
    return rowToNetwork(row)
  },

  async update(id: string, data: Partial<Omit<Network, 'id' | 'created_at'>>): Promise<Network> {
    const current = await prisma.network.findUnique({ where: { id } })
    if (!current) {
      throw createError({ statusCode: 404, message: 'Network not found' })
    }

    validateNetworkInputs(data, current.subnet)

    const row = await prisma.network.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.vlan_id !== undefined ? { vlan_id: data.vlan_id ?? null } : {}),
        ...(data.subnet !== undefined ? { subnet: data.subnet } : {}),
        ...(data.gateway !== undefined ? { gateway: data.gateway ?? null } : {}),
        ...(data.dns_servers !== undefined ? { dns_servers: JSON.stringify(data.dns_servers) } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.is_favorite !== undefined ? { is_favorite: data.is_favorite } : {}),
        updated_at: new Date().toISOString()
      }
    })
    return rowToNetwork(row)
  },

  async delete(id: string): Promise<boolean> {
    try {
      // Cascades to IpAllocation + IpRange via Prisma schema (onDelete: Cascade).
      await prisma.network.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  }
}
