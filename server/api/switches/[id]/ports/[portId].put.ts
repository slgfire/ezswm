import { switchRepository } from '../../../../repositories/switchRepository'
import { updatePortSchema } from '../../../../validators/switchSchemas'
import { activityRepository } from '../../../../repositories/activityRepository'
import type { Port } from '../../../../../types/port'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  const portId = event.context.params?.portId

  if (!switchId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  if (!portId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing port ID' })
  }

  const existing = await switchRepository.getById(switchId)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  const body = await readBody(event)
  const parsed = updatePortSchema.parse(body)

  const updatedPort = await switchRepository.updatePort(switchId, portId, parsed as Partial<Omit<Port, 'id' | 'unit' | 'index'>>)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update_port',
    entity_type: 'switch',
    entity_id: switchId,
    entity_name: existing.name,
    changes: { port_id: portId, ...parsed } as Record<string, unknown>,
  })

  return updatedPort
})
