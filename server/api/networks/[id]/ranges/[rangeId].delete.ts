import { ipRangeRepository } from '../../../../repositories/ipRangeRepository'
import { logActivity } from '../../../../utils/activityLog'

export default defineEventHandler(async (event) => {
  const rangeId = event.context.params?.rangeId

  if (!rangeId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing range ID' })
  }

  const existing = await ipRangeRepository.getById(rangeId)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'IP range not found' })
  }

  await ipRangeRepository.delete(rangeId)

  await logActivity(event, {
    action: 'delete',
    entity_type: 'ip_range',
    entity_id: rangeId,
    entity_name: `${existing.start_ip} - ${existing.end_ip}`,
  })

  setResponseStatus(event, 204)
  return null
})
