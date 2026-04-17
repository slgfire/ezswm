import { readJson, writeJson } from '../storage/jsonStorage'
import type { TopologyLayout } from '../../types/topology'

const FILE_NAME = 'topologyLayouts.json'

type LayoutStore = Record<string, TopologyLayout>

function readAll(): LayoutStore {
  return readJson<LayoutStore>(FILE_NAME)
}

function writeAll(data: LayoutStore): void {
  writeJson(FILE_NAME, data)
}

export const topologyLayoutRepository = {
  getBySiteId(siteId: string): TopologyLayout | null {
    const all = readAll()
    return all[siteId] ?? null
  },

  save(siteId: string, nodePositions: Record<string, { x: number; y: number }>): TopologyLayout {
    const all = readAll()
    const layout: TopologyLayout = {
      node_positions: nodePositions,
      updated_at: new Date().toISOString()
    }
    all[siteId] = layout
    writeAll(all)
    return layout
  },

  deleteBySiteId(siteId: string): boolean {
    const all = readAll()
    if (!(siteId in all)) return false
    delete all[siteId]
    writeAll(all)
    return true
  }
}
