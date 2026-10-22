import { networkRepository } from '../../../repositories/networkRepository'
import { ipAllocationRepository } from '../../../repositories/ipAllocationRepository'
import { ipRangeRepository } from '../../../repositories/ipRangeRepository'
import { findFreeIPs } from '../../../utils/ipv4'
import { freeIpQuerySchema } from '../../../validators/networkSchemas'

/**
 * First free usable addresses of a network (plan A4). Reserved = allocations and
 * every IpRange type. The result is advisory: another writer may take an address
 * before it is allocated.
 */
export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing network ID' })
  }

  const parsed = freeIpQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'count must be an integer between 1 and 100' })
  }

  const network = await networkRepository.getById(id)
  if (!network) {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  const [allocations, ranges] = await Promise.all([
    ipAllocationRepository.list(network.id),
    ipRangeRepository.list(network.id)
  ])

  const freeIps = findFreeIPs(
    network.subnet,
    allocations.map(allocation => allocation.ip_address),
    ranges.map(range => ({ start_ip: range.start_ip, end_ip: range.end_ip })),
    parsed.data.count
  )

  return {
    network_id: network.id,
    subnet: network.subnet,
    count: freeIps.length,
    free_ips: freeIps,
    advisory: 'Free addresses are advisory only; re-check at allocation time.'
  }
})
