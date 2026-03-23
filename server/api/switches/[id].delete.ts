import { switchRepository } from '../../repositories/switchRepository'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  const existing = await switchRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  await switchRepository.delete(id)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'delete',
    entity_type: 'switch',
    entity_id: id,
    entity_name: existing.name,
  })

  setResponseStatus(event, 204)
  return null
})
