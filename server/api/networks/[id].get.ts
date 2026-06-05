import { networkRepository } from '../../repositories/networkRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing network ID' })
  }

  const query = getQuery(event)
  const siteIdParam = typeof query.siteId === 'string' ? query.siteId : undefined
  const siteUuid = await resolveSiteIdQuery(siteIdParam) ?? undefined

  const network = await networkRepository.getByIdOrSlug(id, siteUuid)

  if (!network) {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  return network
})
