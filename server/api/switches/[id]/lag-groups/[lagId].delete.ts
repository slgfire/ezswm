import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { activityRepository } from '../../../../repositories/activityRepository'
import { deleteLagGroupSchema } from '../../../../validators/lagGroupSchemas'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'

export default defineEventHandler(async (event) => {
  const sw = await resolveSwitchParam(event)

  const lagId = event.context.params?.lagId
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  const parsed = deleteLagGroupSchema.safeParse((await readBody(event).catch(() => null)) ?? {})
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid delete request' })

  // Get before delete for logging
  const group = await lagGroupRepository.getById(lagId)
  if (!group || group.switch_id !== sw.id) throw createError({ statusCode: 404, message: 'LAG group not found' })

  const portLabels = group.port_ids
    .map(pid => sw?.ports.find(p => p.id === pid)?.label || pid)

  const deleted = await lagGroupRepository.delete(lagId, parsed.data)
  if (!deleted) throw createError({ statusCode: 404, message: 'LAG group not found' })

  await activityRepository.log({
    user_id: event.context.auth.userId,
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
