import { switchGroupRepository } from '../../repositories/switchGroupRepository'
import { updateSwitchGroupSchema } from '../../validators/switchGroupSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'
import type { SwitchGroup } from '../../../types/switchGroup'

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

  const body = await readBody(event)
  const parsed = updateSwitchGroupSchema.parse(body)

  const updated = await switchGroupRepository.update(
    existing.id,
    parsed as Partial<Omit<SwitchGroup, 'id' | 'created_at'>>,
    siteUuid
  )

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'update',
    entity_type: 'switch_group',
    entity_id: existing.id,
    entity_name: updated.name,
    changes: parsed as Record<string, unknown>,
    previous_state: existing as unknown as Record<string, unknown>
  })

  return updated
})
