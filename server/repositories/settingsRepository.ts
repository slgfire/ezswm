import { readJson, writeJson } from '../storage/jsonStorage'
import type { AppSettings } from '../../types/settings'

const FILE_NAME = 'settings.json'

export const settingsRepository = {
  get(): AppSettings {
    return readJson<AppSettings>(FILE_NAME)
  },

  update(data: Partial<AppSettings>): AppSettings {
    const settings = this.get()
    const updated = { ...settings, ...data }
    writeJson(FILE_NAME, updated)
    return updated
  }
}
