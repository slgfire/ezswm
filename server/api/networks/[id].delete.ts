import { networkRepository } from '../../repositories/networkRepository'
import { ipAllocationRepository } from '../../repositories/ipAllocationRepository'
import { ipRangeRepository } from '../../repositories/ipRangeRepository'
import { activityRepository } from '../../repositories/activityRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing network ID' })
  }

  const query = getQuery(event)
  const siteIdParam = typeof query.siteId === 'string' ? query.siteId : undefined
  const siteUuid = await resolveSiteIdQuery(siteIdParam) ?? undefined

  const existing = await networkRepository.getByIdOrSlug(id, siteUuid)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  // Cascade delete related allocations and ranges
  await ipAllocationRepository.deleteByNetworkId(existing.id)
  await ipRangeRepository.deleteByNetworkId(existing.id)

  await networkRepository.delete(existing.id)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'delete',
    entity_type: 'network',
    entity_id: existing.id,
    entity_name: existing.name,
  })

  setResponseStatus(event, 204)
  return null
})
