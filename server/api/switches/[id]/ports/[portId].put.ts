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

  // Get old port state before update
  const oldPort = existing.ports.find(p => p.id === portId)

  const body = await readBody(event)
  const parsed = updatePortSchema.parse(body)

  // Build changes diff BEFORE normalization — so "clear to automatic" appears in activity as null
  // Build changes diff — only log fields that actually changed
  const changes: Record<string, unknown> = {}
  const previousState: Record<string, unknown> = {}
  if (oldPort) {
    const fields = ['status', 'speed', 'port_mode', 'native_vlan', 'access_vlan', 'tagged_vlans', 'connected_device', 'connected_port', 'description', 'poe', 'connected_allocation_id', 'helper_usage', 'helper_label', 'show_in_helper_list'] as const
    for (const field of fields) {
      const oldVal = oldPort[field]
      const newVal = (parsed as Record<string, unknown>)[field]
      if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[field] = newVal
        previousState[field] = oldVal
      }
    }
  }

  // Normalize null → undefined for clearable helper fields (so they are omitted from stored JSON)
  if (parsed.helper_usage === null) parsed.helper_usage = undefined
  if (parsed.helper_label === null) parsed.helper_label = undefined

  const updatedPort = await switchRepository.updatePort(switchId, portId, parsed as Partial<Omit<Port, 'id' | 'unit' | 'index'>>)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update_port',
    entity_type: 'switch',
    entity_id: switchId,
    entity_name: existing.name,
    metadata: {
      port_id: portId,
      port_label: oldPort?.label || portId,
    },
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    previous_state: Object.keys(previousState).length > 0 ? previousState : undefined,
  })

  return updatedPort
})
