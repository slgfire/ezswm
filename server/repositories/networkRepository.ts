import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { Network } from '../../types/network'
import { isValidCIDR, isValidIPv4, isIPInSubnet, subnetRangeError } from '../utils/ipv4'

const FILE_NAME = 'networks.json'

export const networkRepository = {
  list(): Network[] {
    return readJson<Network[]>(FILE_NAME)
  },

  getById(id: string): Network | null {
    const networks = this.list()
    return networks.find(n => n.id === id) || null
  },

  create(data: Omit<Network, 'id' | 'created_at' | 'updated_at' | 'is_favorite'>): Network {
    if (!isValidCIDR(data.subnet)) {
      throw createError({ statusCode: 400, message: 'Invalid CIDR notation' })
    }

    if (data.gateway && !isValidIPv4(data.gateway)) {
      throw createError({ statusCode: 400, message: 'Invalid gateway IP address' })
    }

    if (data.gateway && !isIPInSubnet(data.gateway, data.subnet)) {
      throw createError({ statusCode: 400, message: 'Gateway is not within the subnet' })
    }

    for (const dns of data.dns_servers) {
      if (!isValidIPv4(dns)) {
        throw createError({ statusCode: 400, message: `Invalid DNS server IP: ${dns}` })
      }
    }

    const networks = this.list()
    const now = new Date().toISOString()
    const network: Network = {
      id: nanoid(),
      ...data,
      is_favorite: false,
      created_at: now,
      updated_at: now
    }

    networks.push(network)
    writeJson(FILE_NAME, networks)
    return network
  },

  update(id: string, data: Partial<Omit<Network, 'id' | 'created_at'>>): Network {
    const networks = this.list()
    const index = networks.findIndex(n => n.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'Network not found' })
    }

    if (data.subnet && !isValidCIDR(data.subnet)) {
      throw createError({ statusCode: 400, message: 'Invalid CIDR notation' })
    }

    const subnet = data.subnet || networks[index]!.subnet

    if (data.gateway && !isValidIPv4(data.gateway)) {
      throw createError({ statusCode: 400, message: 'Invalid gateway IP address' })
    }

    if (data.gateway && !isIPInSubnet(data.gateway, subnet)) {
      throw createError({ statusCode: 400, message: 'Gateway is not within the subnet' })
    }

    if (data.dns_servers) {
      for (const dns of data.dns_servers) {
        if (!isValidIPv4(dns)) {
          throw createError({ statusCode: 400, message: `Invalid DNS server IP: ${dns}` })
        }
      }
    }

    networks[index] = {
      ...networks[index],
      ...data,
      updated_at: new Date().toISOString()
    } as Network

    writeJson(FILE_NAME, networks)
    return networks[index]!
  },

  delete(id: string): boolean {
    const networks = this.list()
    const index = networks.findIndex(n => n.id === id)
    if (index === -1) return false

    networks.splice(index, 1)
    writeJson(FILE_NAME, networks)
    return true
  }
}
