import { prisma } from '../db/client'
import type { AppSettings } from '../../types/settings'
import { DEFAULT_SETTINGS } from '../../types/settings'

const SINGLETON_ID = 'singleton'

function rowToSettings(row: {
  app_name: string
  app_logo_url: string | null
  default_vlan: number | null
  default_port_status: string
  port_speeds: string
  setup_completed: boolean
  sites_initialized: boolean
}): AppSettings {
  return {
    app_name: row.app_name,
    app_logo_url: row.app_logo_url,
    default_vlan: row.default_vlan,
    default_port_status: row.default_port_status as AppSettings['default_port_status'],
    port_speeds: JSON.parse(row.port_speeds) as string[],
    setup_completed: row.setup_completed,
    sites_initialized: row.sites_initialized
  }
}

export const settingsRepository = {
  async get(): Promise<AppSettings> {
    const row = await prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } })
    if (!row) return { ...DEFAULT_SETTINGS }
    return rowToSettings(row)
  },

  async update(data: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get()
    const merged = { ...current, ...data }
    const row = await prisma.appSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        app_name: merged.app_name,
        app_logo_url: merged.app_logo_url,
        default_vlan: merged.default_vlan,
        default_port_status: merged.default_port_status,
        port_speeds: JSON.stringify(merged.port_speeds),
        setup_completed: merged.setup_completed,
        sites_initialized: merged.sites_initialized
      },
      update: {
        app_name: merged.app_name,
        app_logo_url: merged.app_logo_url,
        default_vlan: merged.default_vlan,
        default_port_status: merged.default_port_status,
        port_speeds: JSON.stringify(merged.port_speeds),
        setup_completed: merged.setup_completed,
        sites_initialized: merged.sites_initialized
      }
    })
    return rowToSettings(row)
  }
}
