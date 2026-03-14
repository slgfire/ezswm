import type { AppData, LayoutTemplate, Network, Port, Switch } from '~/types/models'
import { prefixToNetmask } from '~/utils/ip'

function makePorts(count: number, type: Port['mediaType'], start = 1): Port[] {
  return Array.from({ length: count }, (_, index) => {
    const number = start + index
    return {
      id: `port-${number}`,
      identifier: String(number),
      label: `Port ${number}`,
      status: number % 5 === 0 ? 'down' : 'up',
      vlan: number % 2 === 0 ? 10 : 20,
      duplex: 'auto',
      mediaType: type,
      speed: type === 'qsfp' ? '40G' : '10G',
      poe: type === 'rj45'
    }
  })
}

const layoutTemplates: LayoutTemplate[] = [
  {
    id: 'layout-core-48sfp',
    name: 'Core 48xSFP+ + 2xQSFP + MGMT',
    vendor: 'GenericNet',
    model: 'GN-4802X',
    description: 'High-density aggregation switch layout',
    blocks: [
      { id: 'block-sfp', name: 'SFP+ Access', type: 'sfp+', rows: 2, columns: 24, startPort: 1, endPort: 48, order: 1 },
      { id: 'block-qsfp', name: 'QSFP Uplinks', type: 'qsfp', rows: 1, columns: 2, startPort: 49, endPort: 50, order: 2 },
      { id: 'block-mgmt', name: 'Management', type: 'mgmt', rows: 1, columns: 1, explicitPorts: ['mgmt0'], order: 3 }
    ]
  },
  {
    id: 'layout-access-24',
    name: 'Access 24xRJ45 + 4xSFP',
    vendor: 'GenericNet',
    model: 'GN-2404A',
    description: 'Campus access switch layout',
    blocks: [
      { id: 'block-rj45', name: 'Access Ports', type: 'rj45', rows: 2, columns: 12, startPort: 1, endPort: 24, order: 1 },
      { id: 'block-sfp-up', name: 'Uplink SFP', type: 'sfp', rows: 1, columns: 4, startPort: 25, endPort: 28, order: 2 }
    ]
  }
]

const switches: Switch[] = [
  {
    id: 'sw-core-01',
    name: 'CORE-SW-01',
    vendor: 'GenericNet',
    model: 'GN-4802X',
    location: 'Datacenter A',
    rack: 'R1',
    rackPosition: 'U24',
    managementIp: '10.99.30.11',
    serialNumber: 'GNX1234567',
    status: 'active',
    description: 'Core aggregation switch',
    layoutTemplateId: 'layout-core-48sfp',
    tags: ['core', 'dc'],
    ports: [...makePorts(48, 'sfp+', 1), ...makePorts(2, 'qsfp', 49), { id: 'port-mgmt0', identifier: 'mgmt0', label: 'Mgmt', status: 'up', vlan: 130, duplex: 'auto', mediaType: 'mgmt', speed: '1G' }]
  },
  {
    id: 'sw-access-01',
    name: 'ACC-SW-01',
    vendor: 'GenericNet',
    model: 'GN-2404A',
    location: 'Office Floor 1',
    rack: 'F1',
    rackPosition: 'U08',
    managementIp: '10.99.30.21',
    serialNumber: 'GNA9876543',
    status: 'active',
    description: 'User access switch',
    layoutTemplateId: 'layout-access-24',
    tags: ['access'],
    ports: [...makePorts(24, 'rj45', 1), ...makePorts(4, 'sfp', 25)]
  }
]

const networkSeeds = [
  ['USR', 10, '10.10.10.0', 24], ['WLAN_USR', 11, '10.10.11.0', 24], ['ORGA', 20, '10.10.20.0', 24], ['WLAN_ORGA', 21, '10.10.21.0', 24],
  ['DVC', 30, '10.10.30.0', 24], ['WLAN_DVC', 31, '10.10.31.0', 24], ['IOT', 40, '10.10.40.0', 24], ['WLAN_IOT', 41, '10.10.41.0', 24],
  ['VOIP', 50, '10.10.50.0', 24], ['MGMT_SW', 130, '10.99.30.0', 24], ['MGMT_WLAN', 131, '10.99.31.0', 24], ['MGMT_SRV', 132, '10.99.32.0', 24],
  ['MGMT_STO', 133, '10.99.33.0', 24], ['SVC_PRIV', 140, '10.20.40.0', 24], ['SVC_PUB', 141, '10.20.41.0', 24], ['SVC_GAME', 142, '10.20.42.0', 24],
  ['VPN', 150, '10.30.50.0', 24], ['RAC', 160, '10.40.60.0', 24], ['TRANS_CORE', 170, '10.50.70.0', 30], ['TRANS_STO', 171, '10.50.71.0', 30]
] as const

const networks: Network[] = networkSeeds.map(([name, vlanId, subnet, prefix], index) => ({
  id: `net-${index + 1}`,
  vlanId,
  name,
  subnet,
  prefix,
  netmask: prefixToNetmask(prefix),
  gateway: subnet.replace(/\.0$/, '.1'),
  routing: name.startsWith('TRANS') ? 'dynamic' : 'static',
  category: name.includes('MGMT') ? 'management' : 'production',
  description: `${name} VLAN network`,
  notes: ''
}))

export const defaultData: AppData = {
  switches,
  layoutTemplates,
  networks,
  ipAllocations: [
    { id: 'alloc-1', networkId: 'net-10', ipAddress: '10.99.30.11', hostname: 'core-sw-01', serviceName: 'switch-mgmt', status: 'assigned', description: 'Core switch management' },
    { id: 'alloc-2', networkId: 'net-10', ipAddress: '10.99.30.21', hostname: 'acc-sw-01', serviceName: 'switch-mgmt', status: 'assigned', description: 'Access switch management' },
    { id: 'alloc-3', networkId: 'net-15', ipAddress: '10.20.41.10', hostname: 'public-api', serviceName: 'api', status: 'reserved', description: 'Public API endpoint' }
  ],
  ipRanges: [
    { id: 'range-1', networkId: 'net-1', name: 'DHCP Pool', type: 'dhcp', startIp: '10.10.10.100', endIp: '10.10.10.220', description: 'User client pool' },
    { id: 'range-2', networkId: 'net-10', name: 'Infrastructure', type: 'infrastructure', startIp: '10.99.30.10', endIp: '10.99.30.40', description: 'Switch infrastructure' }
  ],
  settings: {
    general: { organizationName: 'ezSWM Lab', timezone: 'Europe/Berlin' },
    ipamDefaults: { defaultPrefix: 24 },
    appearance: { compactTables: false },
    language: { defaultLocale: 'en' }
  }
}
