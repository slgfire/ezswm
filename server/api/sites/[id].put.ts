import { siteRepository } from '../../repositories/siteRepository'
import { updateSiteSchema } from '../../validators/siteSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import type { Site } from '../../../types/site'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }

  const existing = siteRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }

  const body = await readBody(event)
  const parsed = updateSiteSchema.parse(body)

  const updated = siteRepository.update(id, parsed as Partial<Omit<Site, 'id' | 'created_at'>>)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update',
    entity_type: 'site',
    entity_id: id,
    entity_name: updated.name,
    changes: parsed as Record<string, unknown>,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated as unknown as Record<string, unknown>
})
