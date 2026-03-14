import type { LayoutTemplate, Network, NetworkSwitch } from '~/types/domain'
import { prefixToNetmask } from '~/utils/ip'

const mkPorts = (count: number) => Array.from({ length: count }, (_, i) => ({
  portNumber: i + 1,
  label: `Port ${i + 1}`,
  status: i % 7 === 0 ? 'inactive' : 'active',
  vlan: i % 5 === 0 ? 20 : 10,
  duplex: 'auto',
  speed: i < 48 ? '10G' : '40G',
  mediaType: i < 48 ? 'SFP+' : 'QSFP',
  poe: false
}))

export const defaultLayouts: LayoutTemplate[] = [
  {
    id: 'layout-dc-48x2',
    name: 'Data Center 48xSFP+ 2xQSFP 1xMGMT',
    blocks: [
      { id: 'blk-sfp', name: 'SFP+ Access', type: 'sfp', rows: 4, columns: 12, startPort: 1, endPort: 48, order: 1 },
      { id: 'blk-qsfp', name: 'QSFP Uplink', type: 'qsfp', rows: 1, columns: 2, startPort: 49, endPort: 50, order: 2 },
      { id: 'blk-mgmt', name: 'Management', type: 'mgmt', rows: 1, columns: 1, startPort: 51, endPort: 51, order: 3 }
    ]
  }
]

export const defaultSwitches: NetworkSwitch[] = [
  {
    id: 'sw-core-01',
    name: 'CORE-SW-01', vendor: 'Cisco', model: 'Nexus 93180YC', location: 'HQ', rack: 'R1', rackPosition: 'U32',
    managementIp: '10.200.1.10', serialNumber: 'FDO12345ABC', status: 'active', description: 'Core switch', layoutTemplateId: 'layout-dc-48x2',
    ports: mkPorts(51)
  },
  {
    id: 'sw-access-01',
    name: 'ACC-SW-01', vendor: 'Arista', model: '7050X3', location: 'HQ', rack: 'R2', rackPosition: 'U20',
    managementIp: '10.200.1.11', serialNumber: 'JPE09876XYZ', status: 'active', description: 'Access aggregation', layoutTemplateId: 'layout-dc-48x2',
    ports: mkPorts(51)
  }
]

const networkNames = ['USR', 'WLAN_USR', 'ORGA', 'WLAN_ORGA', 'DVC', 'WLAN_DVC', 'IOT', 'WLAN_IOT', 'VOIP', 'MGMT_SW', 'MGMT_WLAN', 'MGMT_SRV', 'MGMT_STO', 'SVC_PRIV', 'SVC_PUB', 'SVC_GAME', 'VPN', 'RAC', 'TRANS_CORE', 'TRANS_STO']

export const defaultNetworks: Network[] = networkNames.map((name, index) => {
  const subnet = `10.${20 + index}.0.0`
  const prefix = 24

  return {
    id: `net-${name.toLowerCase()}`,
    vlanId: 100 + index,
    name,
    subnet,
    prefix,
    netmask: prefixToNetmask(prefix),
    gateway: `10.${20 + index}.0.1`,
    routing: true,
    category: index < 10 ? 'user' : 'service',
    description: `${name} network segment`,
    notes: '',
    allocations: [
      {
        id: `ip-${name.toLowerCase()}-1`,
        ipAddress: `10.${20 + index}.0.10`,
        hostname: `${name.toLowerCase()}-host-1`,
        serviceName: 'infrastructure',
        status: 'active',
        deviceName: `${name}-device-1`
      }
    ],
    ranges: [
      {
        id: `range-${name.toLowerCase()}-dhcp`,
        name: `${name} DHCP`,
        type: 'dhcp',
        startIp: `10.${20 + index}.0.100`,
        endIp: `10.${20 + index}.0.200`
      }
    ]
  }
})
