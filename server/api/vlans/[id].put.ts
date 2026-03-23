import { vlanRepository } from '../../repositories/vlanRepository'
import { updateVlanSchema } from '../../validators/vlanSchemas'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing VLAN ID' })
  }

  const existing = vlanRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'VLAN not found' })
  }

  const body = await readBody(event)
  const parsed = updateVlanSchema.parse(body)

  const updated = vlanRepository.update(id, parsed)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update',
    entity_type: 'vlan',
    entity_id: id,
    entity_name: updated.name,
    changes: parsed,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated
})
