import { settingsRepository } from '../../repositories/settingsRepository'

export default defineEventHandler(async () => {
  return await settingsRepository.get()
})
