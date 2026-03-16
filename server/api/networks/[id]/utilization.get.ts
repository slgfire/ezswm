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

  const totalIps = subnetInfo.total_hosts
  const allocatedCount = allocations.length
  const rangesCount = ranges.length
  const freeCount = Math.max(0, totalIps - allocatedCount)

  return {
    total_ips: totalIps,
    usable_ips: subnetInfo.usable_hosts,
    allocated_count: allocatedCount,
    ranges_count: rangesCount,
    free_count: freeCount,
    utilization_percent: totalIps > 0 ? Math.round((allocatedCount / totalIps) * 10000) / 100 : 0,
  }
})
