import type { AppSettings, IpAllocation, IpRange, LayoutTemplate, Network, Port, Switch } from '~/types/models'
import { prefixToNetmask } from '~/utils/ip'
import { getStores } from '../storage/stores'

const defaultNetworks = [
  ['USR', 10, '10.10.10.0', 24],
  ['WLAN_USR', 11, '10.10.11.0', 24],
  ['ORGA', 20, '10.10.20.0', 24],
  ['WLAN_ORGA', 21, '10.10.21.0', 24],
  ['DVC', 30, '10.10.30.0', 24],
  ['WLAN_DVC', 31, '10.10.31.0', 24],
  ['IOT', 40, '10.10.40.0', 24],
  ['WLAN_IOT', 41, '10.10.41.0', 24],
  ['VOIP', 50, '10.10.50.0', 24],
  ['MGMT_SW', 60, '10.10.60.0', 24],
  ['MGMT_WLAN', 61, '10.10.61.0', 24],
  ['MGMT_SRV', 62, '10.10.62.0', 24],
  ['MGMT_STO', 63, '10.10.63.0', 24],
  ['SVC_PRIV', 70, '10.10.70.0', 24],
  ['SVC_PUB', 71, '10.10.71.0', 24],
  ['SVC_GAME', 72, '10.10.72.0', 24],
  ['VPN', 80, '10.10.80.0', 24],
  ['RAC', 81, '10.10.81.0', 24],
  ['TRANS_CORE', 90, '10.10.90.0', 24],
  ['TRANS_STO', 91, '10.10.91.0', 24]
] as const

const makePorts = (switchId: string): Port[] => {
  const ports: Port[] = []
  for (let i = 1; i <= 50; i++) {
    const mediaType = i <= 48 ? 'sfp+' : 'qsfp'
    ports.push({
      id: `${switchId}-p${i}`,
      switchId,
      portNumber: String(i),
      label: `Port ${i}`,
      status: i % 8 === 0 ? 'down' : 'up',
      vlan: i <= 48 ? 10 + (i % 5) : 90,
      connectedDevice: i % 3 === 0 ? `srv-${i}` : undefined,
      macAddress: i % 3 === 0 ? `AA:BB:CC:DD:EE:${String(i).padStart(2, '0')}` : undefined,
      mediaType,
      duplex: 'auto',
      speed: mediaType === 'qsfp' ? '40G' : '10G',
      poe: false,
      description: mediaType === 'qsfp' ? 'Uplink' : undefined
    })
  }

  ports.push({
    id: `${switchId}-mgmt0`,
    switchId,
    portNumber: 'mgmt0',
    label: 'Management',
    status: 'up',
    mediaType: 'mgmt',
    duplex: 'auto',
    poe: false,
    speed: '1G'
  })

  return ports
}

export default defineNitroPlugin(async () => {
  const stores = getStores()
  const existingSwitches = await stores.switches.readAll()
  if (existingSwitches.length > 0) {
    return
  }

  const layout: LayoutTemplate = {
    id: 'layout-dc-48sfp-2qsfp',
    name: '48x SFP+ + 2x QSFP + MGMT',
    vendor: 'Generic',
    model: 'DC-48SFP2Q',
    description: 'Datacenter top-of-rack layout',
    blocks: [
      { id: 'blk-sfp', name: 'SFP+ Access', type: 'sfp+', rows: 2, columns: 24, startPort: 1, endPort: 48, order: 1 },
      { id: 'blk-uplink', name: 'QSFP Uplink', type: 'qsfp', rows: 1, columns: 2, startPort: 49, endPort: 50, order: 2 },
      { id: 'blk-mgmt', name: 'Management', type: 'mgmt', rows: 1, columns: 1, explicitPorts: ['mgmt0'], order: 3 }
    ]
  }

  const switches: Switch[] = [
    {
      id: 'sw-core-01',
      name: 'SW-CORE-01',
      vendor: 'Arista',
      model: '7050SX3',
      location: 'HQ Datacenter',
      rack: 'R01',
      rackPosition: 'U42',
      managementIp: '10.10.60.10',
      serialNumber: 'AR7050SX3-001',
      status: 'active',
      layoutTemplateId: layout.id,
      tags: ['core', 'spine']
    },
    {
      id: 'sw-core-02',
      name: 'SW-CORE-02',
      vendor: 'Arista',
      model: '7050SX3',
      location: 'HQ Datacenter',
      rack: 'R02',
      rackPosition: 'U42',
      managementIp: '10.10.60.11',
      serialNumber: 'AR7050SX3-002',
      status: 'maintenance',
      layoutTemplateId: layout.id,
      tags: ['core']
    }
  ]

  const networks: Network[] = defaultNetworks.map(([name, vlanId, subnet, prefix]) => ({
    id: `net-${name.toLowerCase()}`,
    name,
    vlanId,
    subnet,
    prefix,
    netmask: prefixToNetmask(prefix),
    gateway: subnet.replace('.0', '.1'),
    category: vlanId >= 60 ? 'management' : 'production',
    description: `${name} segment`
  }))

  const allocations: IpAllocation[] = [
    {
      id: 'alloc-core-01',
      networkId: 'net-mgmt_sw',
      ipAddress: '10.10.60.10',
      hostname: 'sw-core-01',
      deviceName: 'SW-CORE-01',
      status: 'used',
      description: 'Core switch management'
    },
    {
      id: 'alloc-core-02',
      networkId: 'net-mgmt_sw',
      ipAddress: '10.10.60.11',
      hostname: 'sw-core-02',
      deviceName: 'SW-CORE-02',
      status: 'used'
    },
    {
      id: 'alloc-dhcp-relay',
      networkId: 'net-usr',
      ipAddress: '10.10.10.2',
      hostname: 'dhcp-relay-usr',
      serviceName: 'dhcp-relay',
      status: 'reserved'
    }
  ]

  const ranges: IpRange[] = [
    {
      id: 'range-usr-dhcp',
      networkId: 'net-usr',
      name: 'User DHCP',
      type: 'dhcp',
      startIp: '10.10.10.100',
      endIp: '10.10.10.220',
      description: 'Client dynamic leases'
    },
    {
      id: 'range-mgmt-infra',
      networkId: 'net-mgmt_sw',
      name: 'Infra reserved',
      type: 'infrastructure',
      startIp: '10.10.60.2',
      endIp: '10.10.60.40'
    }
  ]

  const settings: (AppSettings & { id: string })[] = [
    {
      id: 'default',
      general: { organizationName: 'ezSWM Demo', timezone: 'Europe/Berlin' },
      ipamDefaults: { defaultPrefix: 24 },
      appearance: { compactTables: false },
      language: { fallbackLocale: 'en' }
    }
  ]

  await Promise.all([
    stores.layouts.writeAll([layout]),
    stores.switches.writeAll(switches),
    stores.ports.writeAll([...makePorts('sw-core-01'), ...makePorts('sw-core-02')]),
    stores.networks.writeAll(networks),
    stores.allocations.writeAll(allocations),
    stores.ranges.writeAll(ranges),
    stores.settings.writeAll(settings)
  ])
})
