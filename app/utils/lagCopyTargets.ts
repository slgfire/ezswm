import type { Port } from '~~/types/port'

export function hasLagTargets(selectedIds: string[], ports: Port[]): boolean {
  return selectedIds.some(id => ports.find(port => port.id === id)?.lag_group_id != null)
}
