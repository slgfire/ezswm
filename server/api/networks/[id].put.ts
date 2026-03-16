import { networkRepository } from '../../repositories/networkRepository'
import { updateNetworkSchema } from '../../validators/networkSchemas'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing network ID' })
  }

  const existing = networkRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  const body = await readBody(event)
  const parsed = updateNetworkSchema.parse(body)

  const updated = networkRepository.update(id, parsed)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update',
    entity_type: 'network',
    entity_id: id,
    entity_name: updated.name,
    changes: parsed,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated
})
