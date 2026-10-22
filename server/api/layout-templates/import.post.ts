import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'
import { createLayoutTemplateSchema } from '../../validators/layoutTemplateSchemas'
import { logActivity } from '../../utils/activityLog'
import type { LayoutTemplate } from '../../../types/layoutTemplate'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = createLayoutTemplateSchema.parse(body)

  const template = await layoutTemplateRepository.create(validated as Omit<LayoutTemplate, 'id' | 'created_at' | 'updated_at'>)

  await logActivity(event, {
    entity_type: 'layout_template',
    entity_id: template.id,
    action: 'create',
    entity_name: template.name,
  })

  setResponseStatus(event, 201)
  return template
})
