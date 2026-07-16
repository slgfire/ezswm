import type { Port } from '~~/types/port'

export function safeCopyTargetIds(sourceId: string, selectedIds: string[], ports: Port[]): string[] | null {
  const targets = selectedIds.filter(id => id !== sourceId)
  return targets.some(id => ports.find(port => port.id === id)?.lag_group_id) ? null : targets
}
