import { networkRepository } from '../../repositories/networkRepository'
import { ipAllocationRepository } from '../../repositories/ipAllocationRepository'
import { ipRangeRepository } from '../../repositories/ipRangeRepository'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing network ID' })
  }

  const existing = networkRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  // Cascade delete related allocations and ranges
  ipAllocationRepository.deleteByNetworkId(id)
  ipRangeRepository.deleteByNetworkId(id)

  networkRepository.delete(id)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'delete',
    entity_type: 'network',
    entity_id: id,
    entity_name: existing.name,
  })

  setResponseStatus(event, 204)
  return null
})
