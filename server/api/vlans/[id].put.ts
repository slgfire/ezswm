import { vlanRepository } from '../../repositories/vlanRepository'
import { updateVlanSchema } from '../../validators/vlanSchemas'
import { logActivity } from '../../utils/activityLog'
import type { VLAN } from '../../../types/vlan'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing VLAN ID' })
  }

  const existing = await vlanRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'VLAN not found' })
  }

  const body = await readBody(event)
  const parsed = updateVlanSchema.parse(body)

  const updated = await vlanRepository.update(id, parsed as Partial<Omit<VLAN, 'id' | 'created_at'>>)

  await logActivity(event, {
    action: 'update',
    entity_type: 'vlan',
    entity_id: id,
    entity_name: updated.name,
    changes: parsed,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated
})
