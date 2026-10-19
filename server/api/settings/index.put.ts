import { settingsRepository } from '../../repositories/settingsRepository'
import { updateSettingsSchema } from '../../validators/settingsSchemas'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid settings data' })
  }
  return await settingsRepository.update(parsed.data)
})
