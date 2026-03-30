import { switchRepository } from '../../repositories/switchRepository'
import { updateSwitchSchema } from '../../validators/switchSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import type { Switch } from '../../../types/switch'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  const existing = await switchRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  const body = await readBody(event)
  const parsed = updateSwitchSchema.parse(body)

  const updated = await switchRepository.update(id, parsed as Partial<Omit<Switch, 'id' | 'ports' | 'created_at'>>)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update',
    entity_type: 'switch',
    entity_id: id,
    entity_name: updated.name,
    changes: parsed as Record<string, unknown>,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated as unknown as Record<string, unknown>
})
