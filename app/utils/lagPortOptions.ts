import type { Port } from '~~/types/port'

export interface LagPortOption {
  label: string
  value: string
}

export function buildLagPortOptions(selectedIds: string[], allPorts: Port[], currentLagId?: string): LagPortOption[] {
  const options = new Map<string, LagPortOption>()
  const selected = new Set(selectedIds)
  for (const port of allPorts) {
    if ((port.lag_group_id == null || port.lag_group_id === currentLagId) && !selected.has(port.id) && !options.has(port.id)) {
      options.set(port.id, { label: port.label || port.id, value: port.id })
    }
  }
  return [...options.values()]
}

export function removeLagPort(portIds: string[], portId: string): string[] {
  return portIds.filter(id => id !== portId)
}
