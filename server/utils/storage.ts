import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { DataStore, LayoutTemplate, Port, Switch } from '~/types/models'

const FILE_NAME = 'store.json'

function now() {
  return new Date().toISOString()
}

function createPort(switchId: string, portNumber: number, overrides: Partial<Port> = {}): Port {
  return {
    switchId,
    portNumber,
    status: 'free',
    mediaType: 'RJ45',
    ...overrides
  }
}

function buildLayoutSequential(id: string, name: string, topStart: number, bottomStart: number, cols: number): LayoutTemplate {
  const cells = []
  for (let col = 1; col <= cols; col++) {
    cells.push({ row: 1, col, portNumber: topStart + col - 1 })
    cells.push({ row: 2, col, portNumber: bottomStart + col - 1 })
  }
  return {
    id,
    name,
    description: '2 Reihen: oben fortlaufend, unten fortlaufend',
    rows: 2,
    cols,
    type: 'sequential',
    cells
  }
}

function buildLayoutOddEven(id: string, name: string, cols: number): LayoutTemplate {
  const cells = []
  for (let col = 1; col <= cols; col++) {
    cells.push({ row: 1, col, portNumber: (col * 2) - 1 })
    cells.push({ row: 2, col, portNumber: col * 2 })
  }
  return {
    id,
    name,
    description: '2 Reihen: oben ungerade, unten gerade',
    rows: 2,
    cols,
    type: 'odd-even',
    cells
  }
}

export function createSeedData(): DataStore {
  const l24 = buildLayoutSequential('layout-24-seq', '24 Port Standard', 1, 13, 12)
  const l48seq = buildLayoutSequential('layout-48-seq', '48 Port Reihenweise', 1, 25, 24)
  const l48odd = buildLayoutOddEven('layout-48-odd-even', '48 Port Ungerade/Gerade', 24)
  const l48uplink: LayoutTemplate = {
    ...l48seq,
    id: 'layout-48-uplink',
    name: '48 Port + 4 SFP Uplink',
    rows: 3,
    cols: 24,
    type: 'custom',
    cells: [
      ...l48seq.cells,
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
      description: 'Demo 24 Port Switch',
      tags: ['core', 'hq'],
      layoutTemplateId: l24.id,
      ports: Array.from({ length: 24 }, (_, i) => createPort('sw-01', i + 1, {
        status: i % 5 === 0 ? 'used' : i % 7 === 0 ? 'disabled' : 'free',
        vlan: i % 5 === 0 ? '10' : '1'
      })),
      createdAt: now(),
      updatedAt: now()
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
      layoutTemplateId: l48seq.id,
      ports: Array.from({ length: 48 }, (_, i) => createPort('sw-02', i + 1, {
        status: i % 13 === 0 ? 'error' : i % 3 === 0 ? 'used' : 'free',
        connectedDevice: i % 3 === 0 ? `Client-${i + 1}` : undefined
      })),
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: 'sw-03',
      name: 'Access-48-ODD-EVEN',
      vendor: 'Juniper',
      model: 'EX3400-48P',
      modelId: 'model-48-juniper',
      locationId: 'loc-branch',
      rackId: 'rack-branch-a',
      rackPosition: '8U',
      managementIp: '10.2.0.5',
      portCount: 48,
      status: 'planned',
      layoutTemplateId: l48odd.id,
      ports: Array.from({ length: 48 }, (_, i) => createPort('sw-03', i + 1, {
        status: i % 9 === 0 ? 'disabled' : 'free'
      })),
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: 'sw-04',
      name: 'Core-Uplink-01',
      vendor: 'Cisco',
      model: 'C9200L-48P-4X',
      modelId: 'model-48-uplink',
      locationId: 'loc-hq',
      rackId: 'rack-hq-b',
      rackPosition: '16U',
      managementIp: '10.0.0.31',
      portCount: 52,
      status: 'retired',
      layoutTemplateId: l48uplink.id,
      ports: Array.from({ length: 52 }, (_, i) => createPort('sw-04', i + 1, {
        status: i < 48 ? (i % 2 === 0 ? 'used' : 'free') : 'used',
        mediaType: i >= 48 ? 'SFP+' : 'RJ45'
      })),
      createdAt: now(),
      updatedAt: now()
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
      { id: 'model-24-cisco', vendorId: 'vendor-cisco', name: 'CBS250-24T-4G', defaultPortCount: 24, defaultLayoutTemplateId: l24.id },
      { id: 'model-48-aruba', vendorId: 'vendor-aruba', name: '2930F-48G', defaultPortCount: 48, defaultLayoutTemplateId: l48seq.id },
      { id: 'model-48-juniper', vendorId: 'vendor-juniper', name: 'EX3400-48P', defaultPortCount: 48, defaultLayoutTemplateId: l48odd.id },
      { id: 'model-48-uplink', vendorId: 'vendor-cisco', name: 'C9200L-48P-4X', defaultPortCount: 52, defaultLayoutTemplateId: l48uplink.id }
    ],
    layoutTemplates: [l24, l48seq, l48odd, l48uplink],
    switches
  }
}

export async function getStorePath(): Promise<string> {
  const config = useRuntimeConfig()
  const dir = config.dataDir
  const fullPath = join(process.cwd(), dir, FILE_NAME)
  await fs.mkdir(dirname(fullPath), { recursive: true })
  return fullPath
}

export async function readStore(): Promise<DataStore> {
  const file = await getStorePath()
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as DataStore
  } catch {
    const seed = createSeedData()
    await writeStore(seed)
    return seed
  }
}

export async function writeStore(store: DataStore) {
  const file = await getStorePath()
  await fs.writeFile(file, JSON.stringify(store, null, 2), 'utf8')
}

export function withTimestamps<T extends object>(existing: T | undefined, payload: T): T & { createdAt: string; updatedAt: string } {
  const stamp = now()
  return {
    ...payload,
    createdAt: (existing as any)?.createdAt || stamp,
    updatedAt: stamp
  } as T & { createdAt: string; updatedAt: string }
}

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`
}
