import { switchRepository } from '../../../repositories/switchRepository'
import { logActivity } from '../../../utils/activityLog'

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

  await logActivity(event, {
    action: 'duplicate',
    entity_type: 'switch',
    entity_id: duplicated.id,
    entity_name: duplicated.name,
  })

  setResponseStatus(event, 201)
  return duplicated
})
