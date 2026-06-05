import { switchRepository } from '../../repositories/switchRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  // Optional ?siteId=<uuid-or-slug> lets callers disambiguate when the same
  // slug exists on multiple sites (per-site unique, not globally).
  const query = getQuery(event)
  const siteIdParam = typeof query.siteId === 'string' ? query.siteId : undefined
  const siteUuid = await resolveSiteIdQuery(siteIdParam) ?? undefined

  const switchItem = await switchRepository.getByIdOrSlug(id, siteUuid)

  if (!switchItem) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  return switchItem
})
