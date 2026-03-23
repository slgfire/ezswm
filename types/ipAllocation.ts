export type DeviceType = 'server' | 'switch' | 'printer' | 'phone' | 'ap' | 'camera' | 'other'
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
