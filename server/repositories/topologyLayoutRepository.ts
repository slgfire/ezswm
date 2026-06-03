import { prisma } from '../db/client'
import type { TopologyLayout } from '../../types/topology'

export const topologyLayoutRepository = {
  async getBySiteId(siteId: string): Promise<TopologyLayout | null> {
    const row = await prisma.topologyLayout.findUnique({ where: { site_id: siteId } })
    if (!row) return null
    return {
      node_positions: JSON.parse(row.node_positions) as Record<string, { x: number; y: number }>,
      updated_at: row.updated_at
    }
  },

  async save(siteId: string, nodePositions: Record<string, { x: number; y: number }>): Promise<TopologyLayout> {
    const updated_at = new Date().toISOString()
    const node_positions = JSON.stringify(nodePositions)
    await prisma.topologyLayout.upsert({
      where: { site_id: siteId },
      create: { site_id: siteId, node_positions, updated_at },
      update: { node_positions, updated_at }
    })
    return { node_positions: nodePositions, updated_at }
  },

  async deleteBySiteId(siteId: string): Promise<boolean> {
    try {
      await prisma.topologyLayout.delete({ where: { site_id: siteId } })
      return true
    } catch {
      return false
    }
  }
}
