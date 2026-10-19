/**
 * Built-in device types (Issue #301). These keys are immutable and always
 * available; `switch` is written automatically by the management-IP sync.
 * They are localized in the UI only — the stored value is always the key.
 */
export const BUILTIN_DEVICE_TYPES = [
  'server', 'switch', 'router', 'firewall', 'printer', 'phone', 'ap', 'camera', 'other'
] as const

export type BuiltinDeviceType = typeof BUILTIN_DEVICE_TYPES[number]

/**
 * Custom device types are stored as their stable UUID in `device_type`.
 * A value may therefore be a builtin key, a custom type id, or a legacy raw
 * string kept from data written before custom types existed.
 */
export type DeviceType = string

export interface CustomDeviceType {
  id: string
  name: string
  active: boolean
}
export type AllocationStatus = 'active' | 'reserved' | 'inactive'

export interface IPAllocation {
  id: string
  network_id: string
  ip_address: string
  hostname?: string
  mac_address?: string
  device_type?: DeviceType
  description?: string
  status: AllocationStatus
  created_at: string
  updated_at: string
}

// Allocation joined with its network, VLAN and site for the site-wide overview.
export interface IpAllocationEnriched extends IPAllocation {
  site_id: string
  site_name: string
  network_name: string
  network_subnet: string
  vlan_ref_id: string | null // network.vlan_id (VLAN entity FK) — used for filtering
  vlan_tag: number | null // vlan.vlan_id (802.1Q tag) — used for display
  vlan_name: string | null
  vlan_color: string | null
}
