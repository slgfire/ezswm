import { vlanRepository } from '../../repositories/vlanRepository'
import { logActivity } from '../../utils/activityLog'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing VLAN ID' })
  }

  const existing = await vlanRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'VLAN not found' })
  }

  if (!(await vlanRepository.delete(id))) {
    throw createError({ statusCode: 404, statusMessage: 'VLAN not found' })
  }

  await logActivity(event, {
    action: 'delete',
    entity_type: 'vlan',
    entity_id: id,
    entity_name: existing.name,
  })

  setResponseStatus(event, 204)
  return null
})
