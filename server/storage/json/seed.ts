import type { DataStore, IpAllocation, LayoutTemplate, Network, Port, Switch } from '~/types/models'
import { nowIso } from '~/server/storage/shared/utils'

function createPort(switchId: string, portNumber: number, overrides: Partial<Port> = {}): Port {
  return {
    switchId,
    portNumber,
    status: 'free',
    mediaType: 'RJ45',
    ...overrides
  }
}

function buildSequentialLayout(id: string, name: string, topStart: number, bottomStart: number, columns: number): LayoutTemplate {
  const cells = []
  for (let column = 1; column <= columns; column++) {
    cells.push({ row: 1, col: column, portNumber: topStart + column - 1 })
    cells.push({ row: 2, col: column, portNumber: bottomStart + column - 1 })
  }

  return {
    id,
    name,
    description: '2 rows: top sequential, bottom sequential',
    rows: 2,
    cols: columns,
    type: 'sequential',
    cells
  }
}

function buildOddEvenLayout(id: string, name: string, columns: number): LayoutTemplate {
  const cells = []
  for (let column = 1; column <= columns; column++) {
    cells.push({ row: 1, col: column, portNumber: (column * 2) - 1 })
    cells.push({ row: 2, col: column, portNumber: column * 2 })
  }

  return {
    id,
    name,
    description: '2 rows: odd numbers on top, even numbers on bottom',
    rows: 2,
    cols: columns,
    type: 'odd-even',
    cells
  }
}

export function createSeedData(): DataStore {
  const layout24 = buildSequentialLayout('layout-24-seq', '24 Port Standard', 1, 13, 12)
  const layout48Sequential = buildSequentialLayout('layout-48-seq', '48 Port Sequential Rows', 1, 25, 24)
  const layout48OddEven = buildOddEvenLayout('layout-48-odd-even', '48 Port Odd/Even', 24)
  const layout48Uplink: LayoutTemplate = {
    ...layout48Sequential,
    id: 'layout-48-uplink',
    name: '48 Port + 4 SFP Uplink',
    rows: 3,
    cols: 24,
    type: 'custom',
    cells: [
      ...layout48Sequential.cells,
      { row: 3, col: 21, portNumber: 49, mediaType: 'SFP+', special: 'uplink', label: 'U1' },
      { row: 3, col: 22, portNumber: 50, mediaType: 'SFP+', special: 'uplink', label: 'U2' },
      { row: 3, col: 23, portNumber: 51, mediaType: 'SFP+', special: 'uplink', label: 'U3' },
      { row: 3, col: 24, portNumber: 52, mediaType: 'SFP+', special: 'uplink', label: 'U4' }
    ]
  }

  const switches: Switch[] = [
    {
      id: 'sw-01',
      name: 'Core-24-01',
      vendor: 'Cisco',
      model: 'CBS250-24T-4G',
      modelId: 'model-24-cisco',
      locationId: 'loc-hq',
      rackId: 'rack-hq-a',
      rackPosition: '12U',
      managementIp: '10.0.0.11',
      serialNumber: 'FOC12345A1',
      portCount: 24,
      status: 'active',
      description: 'Demo 24 port switch',
      tags: ['core', 'hq'],
      layoutTemplateId: layout24.id,
      ports: Array.from({ length: 24 }, (_, index) => createPort('sw-01', index + 1, {
        status: index % 5 === 0 ? 'used' : index % 7 === 0 ? 'disabled' : 'free',
        vlan: index % 5 === 0 ? '10' : '1'
      })),
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    {
      id: 'sw-02',
      name: 'Dist-48-01',
      vendor: 'Aruba',
      model: '2930F-48G',
      modelId: 'model-48-aruba',
      locationId: 'loc-hq',
      rackId: 'rack-hq-a',
      rackPosition: '20U',
      managementIp: '10.0.0.21',
      serialNumber: 'ARB-889912',
      portCount: 48,
      status: 'active',
      tags: ['distribution'],
      layoutTemplateId: layout48Sequential.id,
      ports: Array.from({ length: 48 }, (_, index) => createPort('sw-02', index + 1, {
        status: index % 13 === 0 ? 'error' : index % 3 === 0 ? 'used' : 'free',
        connectedDevice: index % 3 === 0 ? `Client-${index + 1}` : undefined
      })),
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
  ]

  const networks: Network[] = [
    { id: 'net-usr', vlanId: 10, name: 'USR', subnet: '10.10.10.0', prefix: 23, netmask: '255.255.254.0', gateway: '10.10.10.1', routing: 'intra-site', description: 'User clients', maxHosts: 510, tags: ['users'] },
    { id: 'net-wlan-usr', vlanId: 20, name: 'WLAN_USR', subnet: '10.10.20.0', prefix: 23, netmask: '255.255.254.0', gateway: '10.10.20.1', routing: 'intra-site', description: 'Wireless users', maxHosts: 510 },
    { id: 'net-orga', vlanId: 30, name: 'ORGA', subnet: '10.10.30.0', prefix: 24, netmask: '255.255.255.0', gateway: '10.10.30.1', routing: 'intra-site', description: 'Organization services', maxHosts: 254 },
    { id: 'net-wlan-orga', vlanId: 31, name: 'WLAN_ORGA', subnet: '10.10.31.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.31.1', routing: 'intra-site', maxHosts: 62 },
    { id: 'net-dvc', vlanId: 40, name: 'DVC', subnet: '10.10.40.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.40.1', routing: 'intra-site', maxHosts: 62 },
    { id: 'net-wlan-dvc', vlanId: 41, name: 'WLAN_DVC', subnet: '10.10.41.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.41.1', routing: 'intra-site', maxHosts: 62 },
    { id: 'net-iot', vlanId: 42, name: 'IOT', subnet: '10.10.42.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.42.1', routing: 'restricted', maxHosts: 62 },
    { id: 'net-wlan-iot', vlanId: 43, name: 'WLAN_IOT', subnet: '10.10.43.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.43.1', routing: 'restricted', maxHosts: 62 },
    { id: 'net-voip', vlanId: 50, name: 'VOIP', subnet: '10.10.50.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.50.1', routing: 'voice', maxHosts: 62 },
    { id: 'net-mgmt-sw', vlanId: 90, name: 'MGMT_SW', subnet: '10.10.90.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.90.1', routing: 'management', maxHosts: 62 },
    { id: 'net-mgmt-wlan', vlanId: 91, name: 'MGMT_WLAN', subnet: '10.10.91.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.91.1', routing: 'management', maxHosts: 62 },
    { id: 'net-mgmt-srv', vlanId: 100, name: 'MGMT_SRV', subnet: '10.10.100.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.100.1', routing: 'management', maxHosts: 62 },
    { id: 'net-mgmt-sto', vlanId: 101, name: 'MGMT_STO', subnet: '10.10.101.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.101.1', routing: 'management', maxHosts: 62 },
    { id: 'net-svc-priv', vlanId: 110, name: 'SVC_PRIV', subnet: '10.10.110.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.110.1', routing: 'service', maxHosts: 62 },
    { id: 'net-svc-pub', vlanId: 111, name: 'SVC_PUB', subnet: '10.10.111.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.111.1', routing: 'service', maxHosts: 62 },
    { id: 'net-svc-game', vlanId: 112, name: 'SVC_GAME', subnet: '10.10.112.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.112.1', routing: 'service', maxHosts: 62 },
    { id: 'net-vpn', name: 'VPN', subnet: '10.10.199.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.199.1', routing: 'remote-access', maxHosts: 62 },
    { id: 'net-rac', vlanId: 254, name: 'RAC', subnet: '10.10.254.0', prefix: 26, netmask: '255.255.255.192', gateway: '10.10.254.1', routing: 'management', maxHosts: 62 },
    { id: 'net-trans-core', vlanId: 900, name: 'TRANS_CORE', subnet: '172.16.90.0', prefix: 31, netmask: '255.255.255.254', gateway: '172.16.90.0', routing: 'transit', maxHosts: 2 },
    { id: 'net-trans-sto', vlanId: 1010, name: 'TRANS_STO', subnet: '172.16.101.0', prefix: 26, netmask: '255.255.255.192', gateway: '172.16.101.1', routing: 'transit', maxHosts: 62 }
  ]

  const ipAllocations: IpAllocation[] = [
    { id: 'ip-trans-core-sw-core', networkId: 'net-trans-core', ipAddress: '172.16.90.0', deviceName: 'sw-core', status: 'gateway', description: 'Transit peer / gateway' },
    { id: 'ip-trans-core-gw', networkId: 'net-trans-core', ipAddress: '172.16.90.1', hostname: 'gw', status: 'used' },
    { id: 'ip-trans-sto-alpha', networkId: 'net-trans-sto', ipAddress: '172.16.101.10', hostname: 'alpha', status: 'used' },
    { id: 'ip-trans-sto-bravo', networkId: 'net-trans-sto', ipAddress: '172.16.101.11', hostname: 'bravo', status: 'used' },
    { id: 'ip-trans-sto-charlie', networkId: 'net-trans-sto', ipAddress: '172.16.101.12', hostname: 'charlie', status: 'used' },
    { id: 'ip-trans-sto-delta', networkId: 'net-trans-sto', ipAddress: '172.16.101.13', hostname: 'delta', status: 'used' },
    { id: 'ip-trans-sto-yankee', networkId: 'net-trans-sto', ipAddress: '172.16.101.20', hostname: 'yankee', status: 'used' },
    { id: 'ip-trans-sto-zulu', networkId: 'net-trans-sto', ipAddress: '172.16.101.21', hostname: 'zulu', status: 'used' },
    { id: 'ip-trans-sto-backup', networkId: 'net-trans-sto', ipAddress: '172.16.101.30', hostname: 'backup', status: 'reserved' },
    { id: 'ip-mgmt-sw-gw', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.1', hostname: 'gw-mgmt-sw', status: 'gateway' },
    { id: 'ip-mgmt-sw-user1', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.11', hostname: 'user1', status: 'used' },
    { id: 'ip-mgmt-sw-user2', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.12', hostname: 'user2', status: 'used' },
    { id: 'ip-mgmt-sw-user3', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.13', hostname: 'user3', status: 'used' },
    { id: 'ip-mgmt-sw-user4', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.14', hostname: 'user4', status: 'used' },
    { id: 'ip-mgmt-sw-user5', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.15', hostname: 'user5', status: 'used' },
    { id: 'ip-mgmt-sw-user6', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.16', hostname: 'user6', status: 'used' },
    { id: 'ip-mgmt-sw-user7', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.17', hostname: 'user7', status: 'used' },
    { id: 'ip-mgmt-sw-user8', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.18', hostname: 'user8', status: 'used' },
    { id: 'ip-mgmt-sw-user10g', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.19', hostname: 'user-10g', status: 'used' },
    { id: 'ip-mgmt-sw-orga1', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.20', hostname: 'orga1', status: 'used' },
    { id: 'ip-mgmt-sw-orga2', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.21', hostname: 'orga2', status: 'used' },
    { id: 'ip-mgmt-sw-wlc', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.22', hostname: 'wlc', status: 'used' },
    { id: 'ip-mgmt-sw-rac', networkId: 'net-mgmt-sw', ipAddress: '10.10.90.23', hostname: 'rac', status: 'reserved' },
    { id: 'ip-mgmt-wlan-gw', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.1', hostname: 'gw-mgmt-wlan', status: 'gateway' },
    { id: 'ip-mgmt-wlan-wlc', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.10', hostname: 'wlc', status: 'used' },
    { id: 'ip-mgmt-wlan-ap1', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.11', hostname: 'ap1', status: 'used' },
    { id: 'ip-mgmt-wlan-ap2', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.12', hostname: 'ap2', status: 'used' },
    { id: 'ip-mgmt-wlan-ap3', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.13', hostname: 'ap3', status: 'used' },
    { id: 'ip-mgmt-wlan-ap4', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.14', hostname: 'ap4', status: 'used' },
    { id: 'ip-mgmt-wlan-ap5', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.15', hostname: 'ap5', status: 'used' },
    { id: 'ip-mgmt-wlan-ap6', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.16', hostname: 'ap6', status: 'used' },
    { id: 'ip-mgmt-wlan-ap7', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.17', hostname: 'ap7', status: 'used' },
    { id: 'ip-mgmt-wlan-ap8', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.18', hostname: 'ap8', status: 'used' },
    { id: 'ip-mgmt-wlan-ap9', networkId: 'net-mgmt-wlan', ipAddress: '10.10.91.19', hostname: 'ap9', status: 'used' },
    { id: 'ip-mgmt-srv-gw', networkId: 'net-mgmt-srv', ipAddress: '10.10.100.1', hostname: 'gw-mgmt-srv', status: 'gateway' },
    { id: 'ip-mgmt-srv-alpha', networkId: 'net-mgmt-srv', ipAddress: '10.10.100.10', hostname: 'alpha', status: 'used' },
    { id: 'ip-mgmt-srv-bravo', networkId: 'net-mgmt-srv', ipAddress: '10.10.100.11', hostname: 'bravo', status: 'used' },
    { id: 'ip-mgmt-srv-charlie', networkId: 'net-mgmt-srv', ipAddress: '10.10.100.12', hostname: 'charlie', status: 'used' },
    { id: 'ip-mgmt-srv-delta', networkId: 'net-mgmt-srv', ipAddress: '10.10.100.13', hostname: 'delta', status: 'used' },
    { id: 'ip-mgmt-srv-backup', networkId: 'net-mgmt-srv', ipAddress: '10.10.100.30', hostname: 'backup', status: 'reserved' },
    { id: 'ip-mgmt-sto-gw', networkId: 'net-mgmt-sto', ipAddress: '10.10.101.1', hostname: 'gw-mgmt-sto', status: 'gateway' },
    { id: 'ip-mgmt-sto-yankee', networkId: 'net-mgmt-sto', ipAddress: '10.10.101.20', hostname: 'yankee', status: 'used' },
    { id: 'ip-mgmt-sto-zulu', networkId: 'net-mgmt-sto', ipAddress: '10.10.101.21', hostname: 'zulu', status: 'used' },
    { id: 'ip-svc-pub-gw', networkId: 'net-svc-pub', ipAddress: '10.10.111.1', hostname: 'gw-svc-pub', status: 'gateway' },
    { id: 'ip-svc-pub-dns-alpha', networkId: 'net-svc-pub', ipAddress: '10.10.111.10', serviceName: 'dns-alpha', status: 'used' },
    { id: 'ip-svc-pub-dns-bravo', networkId: 'net-svc-pub', ipAddress: '10.10.111.11', serviceName: 'dns-bravo', status: 'used' },
    { id: 'ip-svc-pub-kea-alpha', networkId: 'net-svc-pub', ipAddress: '10.10.111.12', serviceName: 'kea-alpha', status: 'used' },
    { id: 'ip-svc-pub-kea-bravo', networkId: 'net-svc-pub', ipAddress: '10.10.111.13', serviceName: 'kea-bravo', status: 'used' },
    { id: 'ip-svc-pub-traefik', networkId: 'net-svc-pub', ipAddress: '10.10.111.14', serviceName: 'traefik', status: 'used' },
    { id: 'ip-rac-gw', networkId: 'net-rac', ipAddress: '10.10.254.1', hostname: 'gw-rac', status: 'gateway' },
    { id: 'ip-rac-alpha', networkId: 'net-rac', ipAddress: '10.10.254.10', hostname: 'alpha', status: 'used' },
    { id: 'ip-rac-bravo', networkId: 'net-rac', ipAddress: '10.10.254.11', hostname: 'bravo', status: 'used' },
    { id: 'ip-rac-charlie', networkId: 'net-rac', ipAddress: '10.10.254.12', hostname: 'charlie', status: 'used' },
    { id: 'ip-rac-delta', networkId: 'net-rac', ipAddress: '10.10.254.13', hostname: 'delta', status: 'used' },
    { id: 'ip-rac-yankee', networkId: 'net-rac', ipAddress: '10.10.254.20', hostname: 'yankee', status: 'used' },
    { id: 'ip-rac-zulu', networkId: 'net-rac', ipAddress: '10.10.254.21', hostname: 'zulu', status: 'used' },
    { id: 'ip-rac-backup', networkId: 'net-rac', ipAddress: '10.10.254.30', hostname: 'backup', status: 'reserved' }
  ]

  return {
    locations: [
      { id: 'loc-hq', name: 'HQ', room: 'DC-1' },
      { id: 'loc-branch', name: 'Branch', room: 'MDF' }
    ],
    racks: [
      { id: 'rack-hq-a', locationId: 'loc-hq', name: 'Rack A', units: 42 },
      { id: 'rack-hq-b', locationId: 'loc-hq', name: 'Rack B', units: 42 },
      { id: 'rack-branch-a', locationId: 'loc-branch', name: 'Rack 1', units: 24 }
    ],
    vendors: [
      { id: 'vendor-cisco', name: 'Cisco' },
      { id: 'vendor-aruba', name: 'Aruba' },
      { id: 'vendor-juniper', name: 'Juniper' }
    ],
    switchModels: [
      { id: 'model-24-cisco', vendorId: 'vendor-cisco', name: 'CBS250-24T-4G', defaultPortCount: 24, defaultLayoutTemplateId: layout24.id },
      { id: 'model-48-aruba', vendorId: 'vendor-aruba', name: '2930F-48G', defaultPortCount: 48, defaultLayoutTemplateId: layout48Sequential.id },
      { id: 'model-48-juniper', vendorId: 'vendor-juniper', name: 'EX3400-48P', defaultPortCount: 48, defaultLayoutTemplateId: layout48OddEven.id },
      { id: 'model-48-uplink', vendorId: 'vendor-cisco', name: 'C9200L-48P-4X', defaultPortCount: 52, defaultLayoutTemplateId: layout48Uplink.id }
    ],
    layoutTemplates: [layout24, layout48Sequential, layout48OddEven, layout48Uplink],
    switches,
    networks,
    ipAllocations
  }
}

export function hasAnyData(store: DataStore): boolean {
  return Object.values(store).some((collection) => collection.length > 0)
}
