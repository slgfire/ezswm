import type { Port } from '~~/types/port'

export function buildCopyUpdates(source: Pick<Port, 'status' | 'speed' | 'port_mode' | 'access_vlan' | 'native_vlan' | 'tagged_vlans' | 'description' | 'helper_usage'>) {
  return {
    status: source.status,
    speed: source.speed ?? null,
    port_mode: source.port_mode ?? null,
    access_vlan: source.access_vlan ?? null,
    native_vlan: source.native_vlan ?? null,
    description: source.description ?? null,
    helper_usage: source.helper_usage ?? null,
    tagged_vlans: source.tagged_vlans?.length ? source.tagged_vlans : []
  }
}

export function completeLagId(portIds: string[], ports: Port[]): string | undefined {
  const selected = new Set(portIds)
  const lagIds = [...new Set(portIds.map(id => ports.find(port => port.id === id)?.lag_group_id).filter((id): id is string => !!id))]
  if (lagIds.length !== 1) return undefined
  const members = ports.filter(port => port.lag_group_id === lagIds[0]).map(port => port.id)
  return members.length === selected.size && members.every(id => selected.has(id)) ? lagIds[0] : undefined
}
