import { createError } from 'h3'
import { isIpInSubnet, isValidIpv4 } from '~/utils/ip'
import { networkRepository } from '../../../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const payload = await readBody(event)
  const network = await networkRepository.getById(id)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })

  if (!isValidIpv4(payload.startIp) || !isValidIpv4(payload.endIp)) throw createError({ statusCode: 400, statusMessage: 'Invalid IPv4 address' })
  if (!isIpInSubnet(payload.startIp, network.subnet, network.prefix) || !isIpInSubnet(payload.endIp, network.subnet, network.prefix)) {
    throw createError({ statusCode: 400, statusMessage: 'Range outside subnet' })
  }

  network.ranges.push(payload)
  await networkRepository.update(id, { ranges: network.ranges })
  return payload
})
