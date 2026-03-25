import { siteRepository } from '../../repositories/siteRepository'
import { createSiteSchema } from '../../validators/siteSchemas'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createSiteSchema.parse(body)

  const created = siteRepository.create(parsed)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'create',
    entity_type: 'site',
    entity_id: created.id,
    entity_name: created.name,
  })

  setResponseStatus(event, 201)
  return created
})
