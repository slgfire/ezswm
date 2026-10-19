import { customDeviceTypeRepository } from '../../repositories/customDeviceTypeRepository'
import { createCustomDeviceTypeSchema } from '../../validators/customDeviceTypeSchemas'
import { requireAdmin } from '../../utils/requireAdmin'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  const parsed = createCustomDeviceTypeSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid device type data' })
  }

  const created = await customDeviceTypeRepository.create(parsed.data.name)

  setResponseStatus(event, 201)
  return created
})
