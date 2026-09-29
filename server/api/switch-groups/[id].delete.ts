import { switchGroupRepository } from '../../repositories/switchGroupRepository'
import { activityRepository } from '../../repositories/activityRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch group ID' })
  }

  const query = getQuery(event)
  const siteIdParam = typeof query.siteId === 'string'
    ? query.siteId
    : (typeof query.site_id === 'string' ? query.site_id : undefined)
  const siteUuid = await resolveSiteIdQuery(siteIdParam) ?? undefined

  const existing = await switchGroupRepository.getByIdOrSlug(id, siteUuid)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Switch group not found' })
  }

  const deleted = await switchGroupRepository.delete(existing.id, siteUuid)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Switch group not found' })
  }

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'delete',
    entity_type: 'switch_group',
    entity_id: existing.id,
    entity_name: existing.name
  })

  setResponseStatus(event, 204)
  return null
})
