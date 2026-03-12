import type { DataStore, LayoutTemplate, Port, Switch } from '~/types/models'
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
    switches
  }
}

export function hasAnyData(store: DataStore): boolean {
  return Object.values(store).some((collection) => collection.length > 0)
}
