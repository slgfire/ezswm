import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { activityRepository } from '../../../../repositories/activityRepository'
import { createLagGroupSchema } from '../../../../validators/lagGroupSchemas'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'

export default defineEventHandler(async (event) => {
  // Resolve the switch (UUID or per-site slug + ?siteId) to its real PK.
  const sw = await resolveSwitchParam(event)

  const body = await readBody(event)
  const validated = createLagGroupSchema.parse(body)

  const group = await lagGroupRepository.create(sw.id, validated)

  // Resolve port labels for activity log metadata
  const portLabels = group.port_ids
    .map(pid => sw?.ports.find(p => p.id === pid)?.label || pid)
    .slice(0, 10)

  await activityRepository.log({
    user_id: event.context.auth.userId,
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
