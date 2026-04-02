import { ipAllocationRepository } from '../../../../repositories/ipAllocationRepository'
import { switchRepository } from '../../../../repositories/switchRepository'
import { activityRepository } from '../../../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const allocId = event.context.params?.allocId

  if (!allocId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing allocation ID' })
  }

  const existing = ipAllocationRepository.getById(allocId)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'IP allocation not found' })
  }

  // Clear connected_allocation_id on all ports referencing this allocation
  // Keep connected_device string as fallback display
  const allSwitches = switchRepository.list()
  for (const sw of allSwitches) {
    for (const port of sw.ports) {
      if (port.connected_allocation_id === allocId) {
        try {
          switchRepository.updatePort(sw.id, port.id, { connected_allocation_id: undefined })
        } catch { /* best-effort cleanup */ }
      }
    }
  }

  ipAllocationRepository.delete(allocId)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'delete',
    entity_type: 'ip_allocation',
    entity_id: allocId,
    entity_name: existing.ip_address,
  })

  setResponseStatus(event, 204)
  return null
})
