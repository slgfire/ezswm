import { settingsRepository } from '../repositories/settingsRepository'

export async function requirePatchPanelsEnabled(): Promise<void> {
  const settings = await settingsRepository.get()
  if (!settings.patch_panels_enabled) {
    // ponytail: intentionally indistinguishable from missing route while feature is disabled.
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
}
