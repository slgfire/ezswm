import { randomUUID } from 'node:crypto'
import { createError } from 'h3'
import { allocationRepository, networkRepository } from '~/server/storage/repositories'
import { isIpInSubnet, isValidIpv4 } from '~/utils/ip'

export default defineEventHandler(async (event) => {
  const networkId = getRouterParam(event, 'id') || ''
  const network = await networkRepository.findById(networkId)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  const body = await readBody(event)
  if (!isValidIpv4(body.ipAddress)) throw createError({ statusCode: 400, statusMessage: 'Invalid IPv4 address' })
  if (!isIpInSubnet(body.ipAddress, network.subnet, network.prefix)) throw createError({ statusCode: 400, statusMessage: 'IP outside subnet' })
  const existing = (await allocationRepository.getAll()).find(item => item.ipAddress === body.ipAddress)
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Duplicate IP address' })
  return allocationRepository.create({ id: randomUUID(), networkId, ...body })
})
