import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { switchRepository } from '../../../../repositories/switchRepository'
import { activityRepository } from '../../../../repositories/activityRepository'

export default defineEventHandler((event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })

  const lagId = event.context.params?.lagId
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  // Get before delete for logging
  const group = lagGroupRepository.getById(lagId)
  if (!group) throw createError({ statusCode: 404, message: 'LAG group not found' })

  const sw = switchRepository.getById(switchId)
  const portLabels = group.port_ids
    .map(pid => sw?.ports.find(p => p.id === pid)?.label || pid)

  const deleted = lagGroupRepository.delete(lagId)
  if (!deleted) throw createError({ statusCode: 404, message: 'LAG group not found' })

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'delete',
    entity_type: 'lag_group',
    entity_id: group.id,
    entity_name: group.name,
    metadata: {
      ports: portLabels,
      port_count: group.port_ids.length,
    },
  })

  setResponseStatus(event, 204)
  return null
})
