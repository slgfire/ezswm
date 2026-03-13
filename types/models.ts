export type SwitchStatus = 'active' | 'planned' | 'retired'
export type PortStatus = 'free' | 'used' | 'disabled' | 'error'
export type MediaType = 'RJ45' | 'SFP' | 'SFP+' | 'QSFP'
export type DuplexMode = 'half' | 'full' | 'auto'
export type IpAllocationStatus = 'used' | 'reserved' | 'free' | 'gateway'

export interface Location {
  id: string
  name: string
  room?: string
  note?: string
}

export interface Rack {
  id: string
  locationId: string
  name: string
  units?: number
}

export interface Vendor {
  id: string
  name: string
}

export interface LayoutCell {
  row: number
  col: number
  portNumber: number
  group?: string
  mediaType?: MediaType
  label?: string
  special?: 'uplink' | 'stack' | 'management'
}

export interface LayoutTemplate {
  id: string
  name: string
  description?: string
  rows: number
  cols: number
  type: 'sequential' | 'odd-even' | 'custom'
  meta?: Record<string, string>
  cells: LayoutCell[]
  specialAreas?: {
    name: string
    cellRefs: Array<Pick<LayoutCell, 'row' | 'col'>>
  }[]
}

export interface SwitchModel {
  id: string
  vendorId: string
  name: string
  defaultPortCount: number
  defaultLayoutTemplateId?: string
}

export interface Port {
  switchId: string
  portNumber: number
  label?: string
  description?: string
  vlan?: string
  status: PortStatus
  speed?: string
  duplex?: DuplexMode
  poe?: boolean
  connectedDevice?: string
  macAddress?: string
  patchTarget?: string
  mediaType?: MediaType
}

export interface PortUpdatePayload {
  status: PortStatus
  label: string
  description: string
  vlan: string
  speed: string
  duplex: DuplexMode
  poe: boolean
  connectedDevice: string
  macAddress: string
  patchTarget: string
  mediaType?: MediaType
}

export interface Switch {
  id: string
  name: string
  vendor: string
  model: string
  modelId?: string
  locationId?: string
  rackId?: string
  rackPosition?: string
  managementIp: string
  serialNumber?: string
  portCount: number
  description?: string
  status: SwitchStatus
  tags?: string[]
  layoutTemplateId?: string
  layoutOverride?: LayoutTemplate
  ports: Port[]
  createdAt: string
  updatedAt: string
}

export interface Network {
  id: string
  vlanId?: number
  name: string
  subnet: string
  prefix: number
  netmask: string
  gateway?: string
  routing?: string
  description?: string
  notes?: string
  maxHosts: number
  category?: string
  tags?: string[]
}

export interface IpAllocation {
  id: string
  networkId: string
  ipAddress: string
  hostname?: string
  serviceName?: string
  deviceName?: string
  status: IpAllocationStatus
  description?: string
  notes?: string
}

export interface DataStore {
  locations: Location[]
  racks: Rack[]
  vendors: Vendor[]
  switchModels: SwitchModel[]
  layoutTemplates: LayoutTemplate[]
  switches: Switch[]
  networks: Network[]
  ipAllocations: IpAllocation[]
}
