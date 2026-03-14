import { createError } from 'h3'
import { prefixToNetmask } from '~/utils/ip'
import { networkRepository } from '../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const payload = await readBody(event)
  if (payload.prefix !== undefined) payload.netmask = prefixToNetmask(payload.prefix)
  const item = await networkRepository.update(id, payload)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  return item
})
