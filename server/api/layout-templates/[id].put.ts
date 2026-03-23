import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'
import { updateLayoutTemplateSchema } from '../../validators/layoutTemplateSchemas'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Template ID is required' })
  }

  const existing = layoutTemplateRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Layout template not found' })
  }

  const body = await readBody(event)
  const validated = updateLayoutTemplateSchema.parse(body)

  const updated = layoutTemplateRepository.update(id, validated)

  activityRepository.log({
    entity_type: 'layout_template',
    entity_id: id,
    action: 'update',
    user_id: event.context.auth?.userId,
    details: `Updated layout template "${updated.name}"`,
    previous_state: existing,
  })

  return updated
})
