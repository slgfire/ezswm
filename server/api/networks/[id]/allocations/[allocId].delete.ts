import { ipAllocationRepository } from '../../../../repositories/ipAllocationRepository'
import { activityRepository } from '../../../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const allocId = event.context.params?.allocId

  if (!allocId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing allocation ID' })
  }

  const existing = await ipAllocationRepository.getById(allocId)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'IP allocation not found' })
  }

  // The allocation FK clears port references via ON DELETE SET NULL without changing peer links.
  await ipAllocationRepository.delete(allocId)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'delete',
    entity_type: 'ip_allocation',
    entity_id: allocId,
    entity_name: existing.ip_address,
  })

  setResponseStatus(event, 204)
  return null
})
