import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'
import { logActivity } from '../../utils/activityLog'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Template ID is required' })
  }

  const existing = await layoutTemplateRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Layout template not found' })
  }

  await layoutTemplateRepository.delete(id)

  await logActivity(event, {
    entity_type: 'layout_template',
    entity_id: id,
    action: 'delete',
    entity_name: existing.name,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  setResponseStatus(event, 204)
  return null
})
