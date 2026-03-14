import { settingsRepository } from '../storage/repositories/settings-repository'

export default defineEventHandler(async (event) => settingsRepository.update(await readBody(event)))
