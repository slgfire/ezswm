import { siteRepository } from '../../repositories/siteRepository'
import { createSiteSchema } from '../../validators/siteSchemas'
import { logActivity } from '../../utils/activityLog'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createSiteSchema.parse(body)

  const created = await siteRepository.create(parsed)

  await logActivity(event, {
    action: 'create',
    entity_type: 'site',
    entity_id: created.id,
    entity_name: created.name,
  })

  setResponseStatus(event, 201)
  return created
})
