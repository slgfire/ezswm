import { settingsRepository } from '../../repositories/settingsRepository'
import { updateSettingsSchema } from '../../validators/settingsSchemas'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = updateSettingsSchema.parse(body)
  return settingsRepository.update(validated)
})
