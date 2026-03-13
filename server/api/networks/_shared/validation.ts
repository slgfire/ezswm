import type { IpAllocation, IpRange, IpRangeType, Network } from '~/types/models'
import { isIpInRange, isIpInSubnet, isIpv4RangeValid, isValidIpv4, prefixToMask, rangesOverlap, usableHostCount } from '~/server/storage/shared/ipam'

const RANGE_TYPES: IpRangeType[] = ['dhcp', 'reserved', 'static', 'infrastructure', 'guest', 'management', 'service']

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

export function validateIpRangePayload(body: Partial<IpRange>, network: Network, existing: IpRange[]): void {
  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Range name is required.' })
  }

  const type = body.type
  if (!type || !RANGE_TYPES.includes(type)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid IP range type.' })
  }

  if (!body.startIp || !body.endIp) {
    throw createError({ statusCode: 400, statusMessage: 'Range start and end IP are required.' })
  }

  const startIp = body.startIp.trim()
  const endIp = body.endIp.trim()

  if (!isIpv4RangeValid(startIp, endIp)) {
    throw createError({ statusCode: 400, statusMessage: 'Range start IP must be <= end IP and both must be valid IPv4.' })
  }

  if (!isIpInSubnet(startIp, network.subnet, network.prefix) || !isIpInSubnet(endIp, network.subnet, network.prefix)) {
    throw createError({ statusCode: 400, statusMessage: 'Range start and end IP must belong to the selected subnet.' })
  }

  const overlapping = existing.find((entry) => entry.id !== body.id && rangesOverlap(startIp, endIp, entry.startIp, entry.endIp))
  if (!overlapping) return

  const restrictedTypes = new Set<IpRangeType>(['dhcp', 'reserved', 'static'])
  const hasConflict = restrictedTypes.has(type) || restrictedTypes.has(overlapping.type)

  if (hasConflict) {
    throw createError({ statusCode: 409, statusMessage: `Range overlaps with ${overlapping.name} (${overlapping.type}), which is not allowed.` })
  }
}

export function validateAllocationAgainstRanges(body: Partial<IpAllocation>, ranges: IpRange[]): void {
  if (!body.ipAddress || !body.status || body.status !== 'gateway') return
  const ipAddress = body.ipAddress.trim()
  const conflictingRange = ranges.find((range) => range.type === 'dhcp' && isIpInRange(ipAddress, range.startIp, range.endIp))
  if (conflictingRange) {
    throw createError({ statusCode: 409, statusMessage: `Gateway allocation cannot be inside DHCP range ${conflictingRange.name}.` })
  }
}
