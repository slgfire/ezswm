import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'
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

  layoutTemplateRepository.delete(id)

  activityRepository.log({
    entity_type: 'layout_template',
    entity_id: id,
    action: 'delete',
    user_id: event.context.auth?.userId,
    details: `Deleted layout template "${existing.name}"`,
    previous_state: existing,
  })

  setResponseStatus(event, 204)
  return null
})
