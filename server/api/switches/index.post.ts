import { switchRepository } from '../../repositories/switchRepository'
import { createSwitchSchema } from '../../validators/switchSchemas'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createSwitchSchema.parse(body)

  const created = await switchRepository.create(parsed)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'create',
    entity_type: 'switch',
    entity_id: created.id,
    entity_name: created.name,
  })

  setResponseStatus(event, 201)
  return created
})
