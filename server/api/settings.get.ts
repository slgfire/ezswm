import { settingsRepository } from '../storage/repositories/settings-repository'

export default defineEventHandler(async () => settingsRepository.get())
