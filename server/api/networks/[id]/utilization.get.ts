import { networkRepository } from '../../../repositories/networkRepository'
import { ipAllocationRepository } from '../../../repositories/ipAllocationRepository'
import { ipRangeRepository } from '../../../repositories/ipRangeRepository'
import { parseSubnet } from '../../../utils/ipv4'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing network ID' })
  }

  const network = networkRepository.getById(id)

  if (!network) {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  const subnetInfo = parseSubnet(network.subnet)
  const allocations = ipAllocationRepository.list(id)
  const ranges = ipRangeRepository.list(id)

  const usableIps = subnetInfo.usable_hosts
  const allocatedCount = allocations.length
  const rangesCount = ranges.length
  const freeCount = Math.max(0, usableIps - allocatedCount)

  return {
    total_ips: subnetInfo.total_hosts,
    usable_ips: usableIps,
    allocated_count: allocatedCount,
    ranges_count: rangesCount,
    free_count: freeCount,
    utilization_percent: usableIps > 0 ? Math.round((allocatedCount / usableIps) * 10000) / 100 : 0,
  }
})
