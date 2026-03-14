export type SwitchStatus = 'active' | 'maintenance' | 'offline'
export type PortStatus = 'up' | 'down' | 'disabled'

export interface Port {
  portNumber: number
  label: string
  status: PortStatus
  vlan: number | null
  connectedDevice: string
  macAddress: string
  mediaType: string
  duplex: 'auto' | 'half' | 'full'
  speed: string
  poe: boolean
  patchTarget: string
  description: string
}

export interface Switch {
  id: string
  name: string
  vendor: string
  model: string
  location: string
  rack: string
  rackPosition: string
  managementIp: string
  serialNumber: string
  status: SwitchStatus
  description: string
  layoutTemplateId: string
  ports: Port[]
}

export interface LayoutBlock {
  id: string
  name: string
  type: string
  rows: number
  columns: number
  startPort: number
  endPort: number
  description?: string
  order?: number
}

export interface LayoutTemplate {
  id: string
  name: string
  vendor: string
  model: string
  description: string
  blocks: LayoutBlock[]
}

export interface IpAllocation {
  id: string
  networkId: string
  ipAddress: string
  hostname: string
  serviceName: string
  deviceName: string
  status: 'active' | 'reserved' | 'inactive'
  description: string
  notes: string
}

export interface IpRange {
  id: string
  networkId: string
  name: string
  type: 'dhcp' | 'reserved' | 'static' | 'infrastructure'
  startIp: string
  endIp: string
  description: string
  notes: string
}

export interface Network {
  id: string
  vlanId: number
  name: string
  subnet: string
  prefix: number
  netmask: string
  gateway: string
  routing: string
  category: string
  description: string
  notes: string
}
