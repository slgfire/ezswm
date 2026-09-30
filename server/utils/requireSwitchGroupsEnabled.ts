import { settingsRepository } from '../repositories/settingsRepository'

export async function requireSwitchGroupsEnabled(): Promise<void> {
  const settings = await settingsRepository.get()
  if (!settings.switch_groups_enabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
}
