import { ipRangeRepository } from '../../../../repositories/ipRangeRepository'
import { updateIpRangeSchema } from '../../../../validators/ipRangeSchemas'
import { logActivity } from '../../../../utils/activityLog'
import type { IPRange } from '../../../../../types/ipRange'

export default defineEventHandler(async (event) => {
  const rangeId = event.context.params?.rangeId

  if (!rangeId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing range ID' })
  }

  const existing = await ipRangeRepository.getById(rangeId)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'IP range not found' })
  }

  const body = await readBody(event)
  const parsed = updateIpRangeSchema.parse(body)

  const updated = await ipRangeRepository.update(rangeId, parsed as Partial<Omit<IPRange, 'id' | 'created_at' | 'network_id'>>)

  await logActivity(event, {
    action: 'update',
    entity_type: 'ip_range',
    entity_id: rangeId,
    entity_name: `${updated.start_ip} - ${updated.end_ip}`,
    changes: parsed,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated
})
