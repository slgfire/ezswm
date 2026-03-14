export type SwitchStatus = 'active' | 'inactive' | 'maintenance'
export type PortStatus = 'up' | 'down' | 'disabled'
export type PortType = 'rj45' | 'sfp' | 'sfp+' | 'qsfp' | 'mgmt'

export interface LayoutBlock {
  id: string
  name: string
  type: PortType
  rows: number
  columns: number
  startPort?: number
  endPort?: number
  explicitPorts?: string[]
  order: number
  description?: string
}

export interface LayoutTemplate {
  id: string
  name: string
  vendor?: string
  model?: string
  description?: string
  blocks: LayoutBlock[]
}

export interface Port {
  id: string
  switchId: string
  portNumber: string
  label: string
  status: PortStatus
  vlan?: number
  connectedDevice?: string
  macAddress?: string
  mediaType: PortType
  duplex: 'auto' | 'half' | 'full'
  speed?: string
  poe: boolean
  patchTarget?: string
  description?: string
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
  description?: string
  layoutTemplateId: string
  tags?: string[]
}

export interface Network {
  id: string
  vlanId: number
  name: string
  subnet: string
  prefix: number
  netmask: string
  gateway?: string
  routing?: string
  category?: string
  description?: string
  notes?: string
}

export interface IpAllocation {
  id: string
  networkId: string
  ipAddress: string
  hostname: string
  serviceName?: string
  deviceName?: string
  status: 'used' | 'reserved' | 'planned'
  description?: string
  notes?: string
}

export interface IpRange {
  id: string
  networkId: string
  name: string
  type: 'dhcp' | 'reserved' | 'static' | 'infrastructure'
  startIp: string
  endIp: string
  description?: string
  notes?: string
}

export interface AppSettings {
  general: {
    organizationName: string
    timezone: string
  }
  ipamDefaults: {
    defaultPrefix: number
  }
  appearance: {
    compactTables: boolean
  }
  language: {
    fallbackLocale: string
  }
}
