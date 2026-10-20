import { BUILTIN_DEVICE_TYPES, type BuiltinDeviceType } from './ipAllocation'

export interface AppSettings {
  app_name: string
  app_logo_url: string | null
  default_vlan: number | null
  default_port_status: 'up' | 'down' | 'disabled'
  port_speeds: string[]
  setup_completed: boolean
  sites_initialized: boolean
  patch_panels_enabled: boolean
  switch_groups_enabled: boolean
  /** Built-in device-type keys that cannot be newly assigned (Issue #301). */
  disabled_builtin_device_types: BuiltinDeviceType[]
}

const BUILTIN_DEVICE_TYPE_SET = new Set<string>(BUILTIN_DEVICE_TYPES)

/** Lenient read of the stored JSON column; unknown/malformed values are ignored. */
export function parseDisabledBuiltinDeviceTypes(raw: string | null | undefined): BuiltinDeviceType[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (value): value is BuiltinDeviceType => typeof value === 'string' && BUILTIN_DEVICE_TYPE_SET.has(value)
    )
  } catch {
    return []
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  app_name: 'ezSWM',
  app_logo_url: null,
  default_vlan: null,
  default_port_status: 'down',
  port_speeds: ['100M', '1G', '2.5G', '10G', '40G', '100G'],
  setup_completed: false,
  sites_initialized: false,
  patch_panels_enabled: false,
  switch_groups_enabled: true,
  disabled_builtin_device_types: []
}
