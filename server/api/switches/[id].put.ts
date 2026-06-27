import { switchRepository } from '../../repositories/switchRepository'
import { updateSwitchSchema } from '../../validators/switchSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'
import type { Switch } from '../../../types/switch'

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

  const body = await readBody(event)
  const parsed = updateSwitchSchema.parse(body)

  const updated = await switchRepository.update(existing.id, parsed as Partial<Omit<Switch, 'id' | 'ports' | 'created_at'>>)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'update',
    entity_type: 'switch',
    entity_id: existing.id,
    entity_name: updated.name,
    changes: parsed as Record<string, unknown>,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated as unknown as Record<string, unknown>
})
