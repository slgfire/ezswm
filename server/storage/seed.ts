import { allocationRepository, layoutRepository, networkRepository, rangeRepository, switchRepository } from './repositories'
import type { LayoutTemplate, Network, Switch } from '~/types/domain'
import { prefixToNetmask } from '~/utils/ip'

const networkNames = ['USR', 'WLAN_USR', 'ORGA', 'WLAN_ORGA', 'DVC', 'WLAN_DVC', 'IOT', 'WLAN_IOT', 'VOIP', 'MGMT_SW', 'MGMT_WLAN', 'MGMT_SRV', 'MGMT_STO', 'SVC_PRIV', 'SVC_PUB', 'SVC_GAME', 'VPN', 'RAC', 'TRANS_CORE', 'TRANS_STO']

const layouts: LayoutTemplate[] = [{
  id: 'layout-48p-qsfp',
  name: '48x SFP+ + Uplinks',
  vendor: 'Generic',
  model: 'DC-48S-2Q-1M',
  description: 'Datacenter switch front panel layout',
  blocks: [
    { id: 'blk-sfp', name: 'SFP+ Ports', type: 'sfp+', rows: 4, columns: 12, startPort: 1, endPort: 48, order: 1 },
    { id: 'blk-qsfp', name: 'QSFP Uplinks', type: 'qsfp', rows: 1, columns: 2, startPort: 49, endPort: 50, order: 2 },
    { id: 'blk-mgmt', name: 'Management', type: 'mgmt', rows: 1, columns: 1, startPort: 51, endPort: 51, order: 3 }
  ]
}]

const networks: Network[] = networkNames.map((name, i) => {
  const prefix = name.includes('WLAN') ? 24 : 25
  const subnet = `10.${Math.floor(i / 10) + 10}.${i % 10}.0`
  return {
    id: `net-${name.toLowerCase()}`,
    vlanId: 100 + i,
    name,
    subnet,
    prefix,
    netmask: prefixToNetmask(prefix),
    gateway: `10.${Math.floor(i / 10) + 10}.${i % 10}.1`,
    routing: 'internal',
    category: name.startsWith('MGMT') ? 'management' : 'production',
    description: `${name} network segment`,
    notes: ''
  }
})

const switches: Switch[] = [
  {
    id: 'sw-core-01',
    name: 'Core Switch 01',
    vendor: 'Arista',
    model: '7050SX3',
    location: 'Datacenter A',
    rack: 'R12',
    rackPosition: 'U32',
    managementIp: '10.11.1.10',
    serialNumber: 'AR7050SX301',
    status: 'active',
    description: 'Main core switch',
    layoutTemplateId: 'layout-48p-qsfp',
    ports: Array.from({ length: 51 }, (_, idx) => ({
      portNumber: idx + 1,
      label: `Port ${idx + 1}`,
      status: idx < 35 ? 'up' : 'down',
      vlan: idx < 48 ? 100 + (idx % 8) : null,
      connectedDevice: idx < 35 ? `Device-${idx + 1}` : '',
      macAddress: idx < 35 ? `00:1A:2B:3C:${(idx + 1).toString(16).padStart(2, '0')}:AA` : '',
      mediaType: idx < 48 ? 'fiber' : 'ethernet',
      duplex: 'auto',
      speed: idx < 49 ? '10G' : '40G',
      poe: false,
      patchTarget: idx < 35 ? `Patch-${idx + 1}` : '',
      description: ''
    }))
  }
]

export const seedIfEmpty = async () => {
  if ((await layoutRepository.getAll()).length === 0) await layoutRepository.saveAll(layouts)
  if ((await networkRepository.getAll()).length === 0) await networkRepository.saveAll(networks)
  if ((await switchRepository.getAll()).length === 0) await switchRepository.saveAll(switches)
  if ((await allocationRepository.getAll()).length === 0) {
    await allocationRepository.saveAll([
      { id: 'alloc-1', networkId: 'net-usr', ipAddress: '10.10.0.10', hostname: 'usr-laptop-01', serviceName: 'User Access', deviceName: 'Laptop', status: 'active', description: '', notes: '' },
      { id: 'alloc-2', networkId: 'net-mgmt_sw', ipAddress: '10.11.9.11', hostname: 'sw-edge-01', serviceName: 'Switch Mgmt', deviceName: 'Switch', status: 'active', description: '', notes: '' }
    ])
  }
  if ((await rangeRepository.getAll()).length === 0) {
    await rangeRepository.saveAll([
      { id: 'range-1', networkId: 'net-usr', name: 'USR DHCP', type: 'dhcp', startIp: '10.10.0.50', endIp: '10.10.0.180', description: '', notes: '' },
      { id: 'range-2', networkId: 'net-mgmt_sw', name: 'Infrastructure', type: 'infrastructure', startIp: '10.11.9.2', endIp: '10.11.9.40', description: '', notes: '' }
    ])
  }
}
