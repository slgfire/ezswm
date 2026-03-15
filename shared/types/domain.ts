export type SwitchStatus = 'active' | 'planned' | 'maintenance' | 'retired'

export interface Port {
  portNumber: string
  label: string
  status: string
  vlan: string
  connectedDevice: string
  macAddress: string
  mediaType: string
  duplex: string
  speed: string
  poe: string
  patchTarget: string
  description: string
}

export interface SwitchDevice {
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

export interface IpAllocation {
  id: string
  networkId: string
  ipAddress: string
  hostname: string
  serviceName: string
  deviceName: string
  status: string
  description: string
  notes: string
}

export type IpRangeType = 'dhcp' | 'reserved' | 'static' | 'infrastructure'

export interface IpRange {
  id: string
  networkId: string
  name: string
  type: IpRangeType
  startIp: string
  endIp: string
  description: string
  notes: string
}

export interface DataStore {
  switches: SwitchDevice[]
  networks: Network[]
  allocations: IpAllocation[]
  ranges: IpRange[]
}
