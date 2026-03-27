import { siteRepository } from '../../repositories/siteRepository'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }

  const existing = siteRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }

  if (siteRepository.hasEntities(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot delete site with existing entities'
    })
  }

  siteRepository.delete(id)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'delete',
    entity_type: 'site',
    entity_id: id,
    entity_name: existing.name,
  })

  setResponseStatus(event, 204)
  return null
})
