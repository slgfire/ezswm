/**
 * Resolve a port ID to its human-readable label.
 * Falls back to the raw ID if not found.
 */
export function resolvePortLabel(ports: { id: string; label?: string }[], portId: string): string {
  return ports.find(p => p.id === portId)?.label || portId
}
