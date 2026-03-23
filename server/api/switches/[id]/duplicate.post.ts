import { switchRepository } from '../../../repositories/switchRepository'
import { activityRepository } from '../../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  const existing = await switchRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  const duplicated = await switchRepository.duplicate(id)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'duplicate',
    entity_type: 'switch',
    entity_id: duplicated.id,
    entity_name: duplicated.name,
  })

  setResponseStatus(event, 201)
  return duplicated
})
