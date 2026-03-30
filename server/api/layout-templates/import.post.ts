import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'
import { createLayoutTemplateSchema } from '../../validators/layoutTemplateSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import type { LayoutTemplate } from '../../../types/layoutTemplate'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = createLayoutTemplateSchema.parse(body)

  const template = layoutTemplateRepository.create(validated as Omit<LayoutTemplate, 'id' | 'created_at' | 'updated_at'>)

  activityRepository.log({
    entity_type: 'layout_template',
    entity_id: template.id,
    action: 'create',
    user_id: event.context.auth?.userId,
    entity_name: template.name,
  })

  setResponseStatus(event, 201)
  return template
})
