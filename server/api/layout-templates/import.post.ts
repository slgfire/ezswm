import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'
import { createLayoutTemplateSchema } from '../../validators/layoutTemplateSchemas'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = createLayoutTemplateSchema.parse(body)

  const template = layoutTemplateRepository.create(validated)

  activityRepository.log({
    entity_type: 'layout_template',
    entity_id: template.id,
    action: 'create',
    user_id: event.context.auth?.userId,
    details: `Imported layout template "${template.name}"`,
    previous_state: null,
  })

  setResponseStatus(event, 201)
  return template
})
