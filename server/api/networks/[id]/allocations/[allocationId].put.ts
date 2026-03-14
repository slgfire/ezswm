import { createError } from 'h3'
import { isIpInSubnet, isValidIpv4 } from '~/utils/ip'
import { networkRepository } from '../../../../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const allocationId = getRouterParam(event, 'allocationId') || ''
  const payload = await readBody(event)
  const network = await networkRepository.getById(id)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })

  if (payload.ipAddress && (!isValidIpv4(payload.ipAddress) || !isIpInSubnet(payload.ipAddress, network.subnet, network.prefix))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid IP address for this subnet' })
  }

  const index = network.allocations.findIndex(item => item.id === allocationId)
  if (index < 0) throw createError({ statusCode: 404, statusMessage: 'Allocation not found' })

  const nextIp = payload.ipAddress || network.allocations[index].ipAddress
  const duplicate = network.allocations.find(item => item.ipAddress === nextIp && item.id !== allocationId)
  if (duplicate) throw createError({ statusCode: 400, statusMessage: 'Duplicate IP address' })

  network.allocations[index] = { ...network.allocations[index], ...payload }
  await networkRepository.update(id, { allocations: network.allocations })
  return network.allocations[index]
})
