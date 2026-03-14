import type { AppSettings } from '~/types/models'
import { dataStore } from '../data-store'

export const settingsRepository = {
  async get(): Promise<AppSettings> {
    const data = await dataStore.read()
    return data.settings
  },
  async update(payload: Partial<AppSettings>) {
    const data = await dataStore.read()
    data.settings = {
      ...data.settings,
      ...payload,
      general: { ...data.settings.general, ...payload.general },
      ipamDefaults: { ...data.settings.ipamDefaults, ...payload.ipamDefaults },
      appearance: { ...data.settings.appearance, ...payload.appearance },
      language: { ...data.settings.language, ...payload.language }
    }
    await dataStore.write(data)
    return data.settings
  }
}
