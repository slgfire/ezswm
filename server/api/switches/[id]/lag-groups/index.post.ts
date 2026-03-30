import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { switchRepository } from '../../../../repositories/switchRepository'
import { activityRepository } from '../../../../repositories/activityRepository'
import { createLagGroupSchema } from '../../../../validators/lagGroupSchemas'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })

  const body = await readBody(event)
  const validated = createLagGroupSchema.parse(body)

  const group = lagGroupRepository.create(switchId, validated)

  // Resolve port labels for activity log metadata
  const sw = switchRepository.getById(switchId)
  const portLabels = group.port_ids
    .map(pid => sw?.ports.find(p => p.id === pid)?.label || pid)
    .slice(0, 10)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'create',
    entity_type: 'lag_group',
    entity_id: group.id,
    entity_name: group.name,
    metadata: {
      ports: portLabels,
      port_count: group.port_ids.length,
    },
  })

  setResponseStatus(event, 201)
  return group
})
