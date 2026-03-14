import type { IpAllocation, IpAllocationStatus, IpRange, IpRangeType } from '~/types/models'
import { ipRangeSize } from '~/utils/ip'

export const NETWORK_RANGE_TYPES: IpRangeType[] = ['dhcp', 'reserved', 'static', 'infrastructure', 'guest', 'management', 'service']

export function getAllocationDisplayLabel(allocation: IpAllocation) {
  return allocation.hostname || allocation.deviceName || allocation.serviceName || ''
}

export function getAllocationStatusBadgeClass(status: IpAllocationStatus) {
  if (status === 'used') return 'badge--success'
  if (status === 'reserved') return 'badge--warning'
  if (status === 'gateway') return 'badge--danger'
  return 'badge--neutral'
}

export function getRangeTypeBadgeClass(type: IpRangeType) {
  if (type === 'dhcp') return 'badge--info'
  if (type === 'infrastructure' || type === 'management') return 'badge--danger'
  if (type === 'reserved') return 'badge--warning'
  if (type === 'static') return 'badge--success'
  return 'badge--neutral'
}

export function calculateNetworkUsage(maxHosts: number, allocations: IpAllocation[]) {
  const used = allocations.filter((entry) => entry.status === 'used' || entry.status === 'gateway').length
  const reserved = allocations.filter((entry) => entry.status === 'reserved').length
  const free = Math.max(0, maxHosts - used - reserved)
  const utilization = maxHosts > 0 ? Math.round(((used + reserved) / maxHosts) * 100) : 0

  return { total: maxHosts, used, reserved, free, utilization }
}

export function calculateDetailedNetworkUsage(maxHosts: number, allocations: IpAllocation[], ranges: IpRange[]) {
  const used = allocations.filter((entry) => entry.status === 'used' || entry.status === 'gateway').length
  const reservedAllocations = allocations.filter((entry) => entry.status === 'reserved').length
  const dhcp = ranges.filter((entry) => entry.type === 'dhcp').reduce((sum, entry) => sum + ipRangeSize(entry.startIp, entry.endIp), 0)
  const reservedRanges = ranges.filter((entry) => entry.type === 'reserved').reduce((sum, entry) => sum + ipRangeSize(entry.startIp, entry.endIp), 0)

  const reserved = reservedAllocations + reservedRanges
  const occupied = used + reserved + dhcp
  const free = Math.max(0, maxHosts - occupied)
  const utilization = maxHosts > 0 ? Math.round((occupied / maxHosts) * 100) : 0

  return { total: maxHosts, used, reserved, dhcp, free, utilization }
}
