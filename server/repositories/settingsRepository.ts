import { prisma } from '../db/client'
import type { AppSettings } from '../../types/settings'
import { DEFAULT_SETTINGS, parseDisabledBuiltinDeviceTypes } from '../../types/settings'

const SINGLETON_ID = 'singleton'

function rowToSettings(row: {
  app_name: string
  app_logo_url: string | null
  default_vlan: number | null
  default_port_status: string
  port_speeds: string
  setup_completed: boolean
  sites_initialized: boolean
  patch_panels_enabled?: boolean
  switch_groups_enabled?: boolean
  disabled_builtin_device_types?: string
}): AppSettings {
  return {
    app_name: row.app_name,
    app_logo_url: row.app_logo_url,
    default_vlan: row.default_vlan,
    default_port_status: row.default_port_status as AppSettings['default_port_status'],
    port_speeds: JSON.parse(row.port_speeds) as string[],
    setup_completed: row.setup_completed,
    sites_initialized: row.sites_initialized,
    patch_panels_enabled: row.patch_panels_enabled ?? false,
    switch_groups_enabled: row.switch_groups_enabled ?? true,
    // Older rows/missing columns read as "nothing disabled".
    disabled_builtin_device_types: parseDisabledBuiltinDeviceTypes(row.disabled_builtin_device_types)
  }
}

export const settingsRepository = {
  async get(): Promise<AppSettings> {
    const row = await prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } })
    if (!row) return { ...DEFAULT_SETTINGS }
    return rowToSettings(row)
  },

  async update(data: Partial<Omit<AppSettings, 'setup_completed'>>): Promise<AppSettings> {
    const patch = {
      ...(data.app_name !== undefined ? { app_name: data.app_name } : {}),
      ...(data.app_logo_url !== undefined ? { app_logo_url: data.app_logo_url } : {}),
      ...(data.default_vlan !== undefined ? { default_vlan: data.default_vlan } : {}),
      ...(data.default_port_status !== undefined ? { default_port_status: data.default_port_status } : {}),
      ...(data.port_speeds !== undefined ? { port_speeds: JSON.stringify(data.port_speeds) } : {}),
      ...(data.sites_initialized !== undefined ? { sites_initialized: data.sites_initialized } : {}),
      ...(data.patch_panels_enabled !== undefined ? { patch_panels_enabled: data.patch_panels_enabled } : {}),
      ...(data.switch_groups_enabled !== undefined ? { switch_groups_enabled: data.switch_groups_enabled } : {}),
      ...(data.disabled_builtin_device_types !== undefined ? { disabled_builtin_device_types: JSON.stringify(data.disabled_builtin_device_types) } : {})
    }
    const row = await prisma.appSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        ...DEFAULT_SETTINGS,
        port_speeds: JSON.stringify(DEFAULT_SETTINGS.port_speeds),
        disabled_builtin_device_types: JSON.stringify(DEFAULT_SETTINGS.disabled_builtin_device_types),
        ...patch
      },
      update: patch
    })
    return rowToSettings(row)
  }
}
