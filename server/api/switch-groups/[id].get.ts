import { switchGroupRepository } from '../../repositories/switchGroupRepository'
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

  const group = await switchGroupRepository.getByIdOrSlug(id, siteUuid)
  if (!group) {
    throw createError({ statusCode: 404, statusMessage: 'Switch group not found' })
  }

  return group
})
