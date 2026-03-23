import { settingsRepository } from '../../repositories/settingsRepository'

export default defineEventHandler(() => {
  return settingsRepository.get()
})
