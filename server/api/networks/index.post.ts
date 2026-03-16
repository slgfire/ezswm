import { networkRepository } from '../../repositories/networkRepository'
import { createNetworkSchema } from '../../validators/networkSchemas'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createNetworkSchema.parse(body)

  const created = networkRepository.create(parsed)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'create',
    entity_type: 'network',
    entity_id: created.id,
    entity_name: created.name,
  })

  setResponseStatus(event, 201)
  return created
})
