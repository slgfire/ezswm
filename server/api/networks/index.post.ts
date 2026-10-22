import { networkRepository } from '../../repositories/networkRepository'
import { createNetworkSchema } from '../../validators/networkSchemas'
import { logActivity } from '../../utils/activityLog'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createNetworkSchema.parse(body)

  const created = await networkRepository.create(parsed)

  await logActivity(event, {
    action: 'create',
    entity_type: 'network',
    entity_id: created.id,
    entity_name: created.name,
  })

  setResponseStatus(event, 201)
  return created
})
