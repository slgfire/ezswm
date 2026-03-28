import type { PoeConfig } from './layoutTemplate'

export type PortType = 'rj45' | 'sfp' | 'sfp+' | 'qsfp' | 'console' | 'management'
export type PortSpeed = '100M' | '1G' | '2.5G' | '10G' | '100G'
export type PortStatus = 'up' | 'down' | 'disabled'
export type PortMode = 'access' | 'trunk'

export interface Port {
  id: string
  unit: number
  index: number
  label?: string
  type: PortType
  speed?: PortSpeed
  status: PortStatus
  port_mode?: PortMode
  access_vlan?: number
  native_vlan?: number
  tagged_vlans: number[]
  connected_device?: string
  connected_device_id?: string
  connected_port_id?: string
  connected_port?: string
  description?: string
  mac_address?: string
  lag_group_id?: string
  poe?: PoeConfig | null
}
