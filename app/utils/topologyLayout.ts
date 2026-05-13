import type { TopologyNode, TopologyGhostNode } from '~~/types/topology'

export function calculateTopologyLayout(
  nodes: TopologyNode[],
  ghostNodes: TopologyGhostNode[]
): Record<string, { x: number; y: number }> {
  const tiers: Record<number, string[]> = { 0: [], 1: [], 2: [] }

  for (const n of nodes) {
    if (n.role === 'core') tiers[0]!.push(n.id)
    else if (n.role === 'distribution') tiers[1]!.push(n.id)
    else tiers[2]!.push(n.id)
  }

  // Skip empty tiers
  const activeTiers: string[][] = []
  for (const t of [tiers[0]!, tiers[1]!, tiers[2]!]) {
    if (t.length > 0) activeTiers.push(t)
  }

  const positions: Record<string, { x: number; y: number }> = {}
  const xSpacing = 200
  const ySpacing = 220

  for (let tierIdx = 0; tierIdx < activeTiers.length; tierIdx++) {
    const nodeIds = activeTiers[tierIdx]!
    const totalWidth = (nodeIds.length - 1) * xSpacing
    const startX = -totalWidth / 2

    for (let i = 0; i < nodeIds.length; i++) {
      positions[nodeIds[i]!] = {
        x: startX + i * xSpacing,
        y: tierIdx * ySpacing
      }
    }
  }

  const lastTierY = (activeTiers.length - 1) * ySpacing
  const ghostY = lastTierY + ySpacing
  let ghostX = -(ghostNodes.length - 1) * xSpacing / 2
  for (const g of ghostNodes) {
    if (!positions[g.id]) {
      positions[g.id] = { x: ghostX, y: ghostY }
      ghostX += xSpacing
    }
  }

  return positions
}
