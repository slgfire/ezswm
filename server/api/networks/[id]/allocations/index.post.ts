import { createError } from 'h3'
import { isIpInSubnet, isValidIpv4 } from '~/utils/ip'
import { networkRepository } from '../../../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const payload = await readBody(event)
  const network = await networkRepository.getById(id)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })

  if (!isValidIpv4(payload.ipAddress)) throw createError({ statusCode: 400, statusMessage: 'Invalid IPv4 address' })
  if (!isIpInSubnet(payload.ipAddress, network.subnet, network.prefix)) throw createError({ statusCode: 400, statusMessage: 'IP outside subnet' })
  if (network.allocations.some(ip => ip.ipAddress === payload.ipAddress)) throw createError({ statusCode: 400, statusMessage: 'Duplicate IP address' })

  network.allocations.push(payload)
  await networkRepository.update(id, { allocations: network.allocations })
  return payload
})
