import { vlanRepository } from '../../repositories/vlanRepository'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing VLAN ID' })
  }

  const existing = vlanRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'VLAN not found' })
  }

  vlanRepository.delete(id)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'delete',
    entity_type: 'vlan',
    entity_id: id,
    entity_name: existing.name,
  })

  setResponseStatus(event, 204)
  return null
})
