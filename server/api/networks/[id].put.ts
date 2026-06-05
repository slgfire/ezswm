import { networkRepository } from '../../repositories/networkRepository'
import { updateNetworkSchema } from '../../validators/networkSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'
import type { Network } from '../../../types/network'

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

  const body = await readBody(event)
  const parsed = updateNetworkSchema.parse(body)

  const updated = await networkRepository.update(existing.id, parsed as Partial<Omit<Network, 'id' | 'created_at'>>)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update',
    entity_type: 'network',
    entity_id: existing.id,
    entity_name: updated.name,
    changes: parsed,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated
})
