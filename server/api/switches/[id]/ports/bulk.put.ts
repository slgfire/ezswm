import { switchRepository } from '../../../../repositories/switchRepository'
import { bulkUpdatePortsSchema } from '../../../../validators/switchSchemas'
import { activityRepository } from '../../../../repositories/activityRepository'
import type { Port } from '../../../../../types/port'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id

  if (!switchId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  const existing = await switchRepository.getById(switchId)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  const body = await readBody(event)
  const parsed = bulkUpdatePortsSchema.parse(body)

  const updatedPorts = await switchRepository.bulkUpdatePorts(switchId, parsed.port_ids, parsed.updates as Partial<Omit<Port, 'id' | 'unit' | 'index'>>)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'bulk_update_ports',
    entity_type: 'switch',
    entity_id: switchId,
    entity_name: existing.name,
    changes: { port_ids: parsed.port_ids, updates: parsed.updates } as Record<string, unknown>,
  })

  return updatedPorts
})
