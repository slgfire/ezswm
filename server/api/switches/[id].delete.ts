import { switchRepository } from '../../repositories/switchRepository'
import { activityRepository } from '../../repositories/activityRepository'
import { lagGroupRepository } from '../../repositories/lagGroupRepository'
import { publicTokenRepository } from '../../repositories/publicTokenRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  const query = getQuery(event)
  const siteIdParam = typeof query.siteId === 'string' ? query.siteId : undefined
  const siteUuid = await resolveSiteIdQuery(siteIdParam) ?? undefined

  const existing = await switchRepository.getByIdOrSlug(id, siteUuid)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  // Clean up LAG groups before deleting switch
  await lagGroupRepository.deleteBySwitchId(existing.id)
  await publicTokenRepository.deleteBySwitchId(existing.id)

  await switchRepository.delete(existing.id)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'delete',
    entity_type: 'switch',
    entity_id: existing.id,
    entity_name: existing.name,
  })

  setResponseStatus(event, 204)
  return null
})
