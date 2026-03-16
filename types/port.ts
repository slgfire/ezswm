export type PortType = 'rj45' | 'sfp' | 'sfp+' | 'console' | 'management'
export type PortSpeed = '100M' | '1G' | '10G' | '25G' | '40G' | '100G'
export type PortStatus = 'up' | 'down' | 'disabled'

export interface Port {
  id: string
  unit: number
  index: number
  label?: string
  type: PortType
  speed?: PortSpeed
  status: PortStatus
  native_vlan?: number
  tagged_vlans: number[]
  connected_device?: string
  connected_device_id?: string
  connected_port_id?: string
  connected_port?: string
  description?: string
  mac_address?: string
  lag_group_id?: string
}
