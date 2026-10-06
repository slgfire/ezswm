export interface TopologyNodeDomRecord {
  /** Switch/ghost node ID read from the node's data-topology-node-id marker, or null when absent. */
  nodeId: string | null
  /** The node element's SVG `transform` attribute (world translate), or null when absent. */
  transform: string | null
}

const TRANSLATE_PATTERN = /translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/

/**
 * Collects node positions from a full snapshot of the rendered topology nodes.
 * The node ID comes only from the explicit ID marker (never from the visible label), the position from
 * the node's world translate transform. Records without a known ID or without a finite translate are
 * omitted; there is no name-based fallback.
 */
export function collectTopologyNodePositions(
  records: Iterable<TopologyNodeDomRecord>,
  knownNodeIds: ReadonlySet<string>
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {}
  for (const record of records) {
    const { nodeId, transform } = record
    if (!nodeId || !knownNodeIds.has(nodeId)) continue
    const match = (transform || '').match(TRANSLATE_PATTERN)
    if (!match) continue
    const x = Number(match[1])
    const y = Number(match[2])
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    positions[nodeId] = { x, y }
  }
  return positions
}
