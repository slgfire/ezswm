import { customDeviceTypeRepository } from '../../repositories/customDeviceTypeRepository'
import { logActivity } from '../../utils/activityLog'
import { requireAdmin } from '../../utils/requireAdmin'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Device type ID is required' })
  }

  const deleted = await customDeviceTypeRepository.deleteUnused(id)

  await logActivity(event, {
    action: 'delete',
    entity_type: 'device_type',
    entity_id: id,
    entity_name: deleted.name,
    previous_state: deleted as unknown as Record<string, unknown>
  })

  setResponseStatus(event, 204)
  return null
})
