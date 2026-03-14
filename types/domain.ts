export type EntityStatus = 'active' | 'inactive' | 'planned' | 'error'

export interface LayoutBlock {
  id: string
  name: string
  type: 'sfp' | 'qsfp' | 'mgmt' | 'rj45'
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
  description?: string
  blocks: LayoutBlock[]
}

export interface Port {
  portNumber: number
  label: string
  status: EntityStatus
  vlan?: number
  connectedDevice?: string
  macAddress?: string
  mediaType?: string
  duplex: 'auto' | 'half' | 'full'
  speed?: string
  poe?: boolean
  patchTarget?: string
  description?: string
}

export interface NetworkSwitch {
  id: string
  name: string
  vendor: string
  model: string
  location: string
  rack: string
  rackPosition: string
  managementIp: string
  serialNumber: string
  status: EntityStatus
  description?: string
  layoutTemplateId: string
  ports: Port[]
}

export interface IpAllocation {
  id: string
  ipAddress: string
  hostname: string
  serviceName?: string
  deviceName?: string
  status: EntityStatus
  description?: string
  notes?: string
}

export interface IpRange {
  id: string
  name: string
  type: 'dhcp' | 'reserved' | 'static' | 'infrastructure'
  startIp: string
  endIp: string
  description?: string
  notes?: string
}

export interface Network {
  id: string
  vlanId: number
  name: string
  subnet: string
  prefix: number
  netmask: string
  gateway: string
  routing: boolean
  category: string
  description?: string
  notes?: string
  allocations: IpAllocation[]
  ranges: IpRange[]
}
