import type { IpAllocation, Network } from '~/types/models'
import { isIpInSubnet, isValidIpv4, prefixToMask, usableHostCount } from '~/server/storage/shared/ipam'

export function validateNetworkPayload(body: Partial<Network>): asserts body is Partial<Network> {
  if (!body.name || !body.subnet) {
    throw createError({ statusCode: 400, statusMessage: 'Network name and subnet are required.' })
  }

  if (!isValidIpv4(body.subnet)) {
    throw createError({ statusCode: 400, statusMessage: 'Subnet must be a valid IPv4 address.' })
  }

  const prefix = Number(body.prefix)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw createError({ statusCode: 400, statusMessage: 'Prefix must be a value between 0 and 32.' })
  }

  if (body.vlanId !== undefined && body.vlanId !== null) {
    const vlanId = Number(body.vlanId)
    if (!Number.isFinite(vlanId)) {
      throw createError({ statusCode: 400, statusMessage: 'VLAN ID must be numeric.' })
    }
  }

  if (body.gateway && !isValidIpv4(body.gateway)) {
    throw createError({ statusCode: 400, statusMessage: 'Gateway must be a valid IPv4 address.' })
  }

  if (body.gateway && !isIpInSubnet(body.gateway, body.subnet, prefix)) {
    throw createError({ statusCode: 400, statusMessage: 'Gateway must belong to the subnet.' })
  }
}

export function normalizeNetworkPayload(body: Partial<Network>): Omit<Network, 'id'> {
  const prefix = Number(body.prefix)
  return {
    vlanId: body.vlanId !== undefined && body.vlanId !== null ? Number(body.vlanId) : undefined,
    name: body.name!.trim(),
    subnet: body.subnet!.trim(),
    prefix,
    netmask: body.netmask?.trim() || prefixToMask(prefix),
    gateway: body.gateway?.trim(),
    routing: body.routing?.trim(),
    description: body.description?.trim(),
    notes: body.notes?.trim(),
    maxHosts: body.maxHosts && body.maxHosts > 0 ? body.maxHosts : usableHostCount(prefix),
    category: body.category?.trim(),
    tags: body.tags || []
  }
}

export function validateAllocationPayload(body: Partial<IpAllocation>, network: Network, existing: IpAllocation[]): void {
  if (!body.ipAddress) {
    throw createError({ statusCode: 400, statusMessage: 'IP address is required.' })
  }

  const ipAddress = body.ipAddress.trim()
  if (!isValidIpv4(ipAddress)) {
    throw createError({ statusCode: 400, statusMessage: 'IP address must be valid IPv4.' })
  }

  if (!isIpInSubnet(ipAddress, network.subnet, network.prefix)) {
    throw createError({ statusCode: 400, statusMessage: 'IP address must belong to the selected subnet.' })
  }

  if (existing.some((entry) => entry.ipAddress === ipAddress && entry.id !== body.id)) {
    throw createError({ statusCode: 409, statusMessage: 'IP address already exists in this network.' })
  }

  const status = body.status || 'used'
  if (!['used', 'reserved', 'free', 'gateway'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid allocation status.' })
  }

  if (status === 'gateway') {
    const hasGateway = existing.some((entry) => entry.status === 'gateway' && entry.id !== body.id)
    if (hasGateway) {
      throw createError({ statusCode: 409, statusMessage: 'Only one gateway allocation is allowed per network.' })
    }
  }
}
