import { ipAllocationRepository } from '../../../../repositories/ipAllocationRepository'
import { networkRepository } from '../../../../repositories/networkRepository'
import { updateIpAllocationSchema } from '../../../../validators/ipAllocationSchemas'
import { activityRepository } from '../../../../repositories/activityRepository'
import type { IPAllocation } from '../../../../../types/ipAllocation'

export default defineEventHandler(async (event) => {
  const networkId = event.context.params?.id
  const allocId = event.context.params?.allocId

  if (!networkId || !allocId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing allocation ID' })
  }

  const network = await networkRepository.getById(networkId)
  if (!network) {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  const existing = await ipAllocationRepository.getById(allocId)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'IP allocation not found' })
  }

  if (existing.network_id !== network.id) {
    throw createError({ statusCode: 404, statusMessage: 'IP allocation not found' })
  }

  const body = await readBody(event)
  const parsed = updateIpAllocationSchema.parse(body)

  const updated = await ipAllocationRepository.update(allocId, parsed as Partial<Omit<IPAllocation, 'id' | 'created_at'>>)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'update',
    entity_type: 'ip_allocation',
    entity_id: allocId,
    entity_name: updated.ip_address,
    changes: parsed,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated
})
