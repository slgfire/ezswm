import { createError } from 'h3'
import { networkRepository } from '../../../../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const allocationId = getRouterParam(event, 'allocationId') || ''
  const network = await networkRepository.getById(id)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })

  network.allocations = network.allocations.filter(item => item.id !== allocationId)
  await networkRepository.update(id, { allocations: network.allocations })
  return { ok: true }
})
