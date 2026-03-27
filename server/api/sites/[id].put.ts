import { siteRepository } from '../../repositories/siteRepository'
import { updateSiteSchema } from '../../validators/siteSchemas'
import { activityRepository } from '../../repositories/activityRepository'

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

  const updated = siteRepository.update(id, parsed)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update',
    entity_type: 'site',
    entity_id: id,
    entity_name: updated.name,
    changes: parsed,
    previous_state: existing,
  })

  return updated
})
