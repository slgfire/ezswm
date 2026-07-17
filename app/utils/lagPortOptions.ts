import type { Port } from '~~/types/port'

export interface LagPortOption {
  label: string
  value: string
}

export function buildLagPortOptions(currentMembers: Port[], allPorts: Port[]): LagPortOption[] {
  const options = new Map<string, LagPortOption>()
  for (const port of currentMembers) options.set(port.id, { label: port.label || port.id, value: port.id })
  for (const port of allPorts) {
    if (!port.lag_group_id && !options.has(port.id)) options.set(port.id, { label: port.label || port.id, value: port.id })
  }
  return [...options.values()]
}

export function removeLagPort(portIds: string[], portId: string): string[] {
  return portIds.filter(id => id !== portId)
}
