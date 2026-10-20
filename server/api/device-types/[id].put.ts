import { customDeviceTypeRepository } from '../../repositories/customDeviceTypeRepository'
import { updateCustomDeviceTypeSchema } from '../../validators/customDeviceTypeSchemas'
import { requireAdmin } from '../../utils/requireAdmin'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Device type ID is required' })
  }

  const body = await readBody(event)
  const parsed = updateCustomDeviceTypeSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid device type data' })
  }

  return customDeviceTypeRepository.update(id, parsed.data)
})
