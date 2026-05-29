export type DeviceType = 'server' | 'switch' | 'router' | 'firewall' | 'printer' | 'phone' | 'ap' | 'camera' | 'other'
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
