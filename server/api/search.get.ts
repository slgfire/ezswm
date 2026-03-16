import { switchRepository } from '../repositories/switchRepository'
import { vlanRepository } from '../repositories/vlanRepository'
import { networkRepository } from '../repositories/networkRepository'
import { ipAllocationRepository } from '../repositories/ipAllocationRepository'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const q = String(query.q || '').toLowerCase().trim()

  if (!q || q.length < 2) {
    return { switches: [], vlans: [], networks: [], allocations: [] }
  }

  const MAX_PER_TYPE = 10

  const switches = switchRepository.list()
    .filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.model?.toLowerCase().includes(q) ||
      s.manufacturer?.toLowerCase().includes(q) ||
      s.serial_number?.toLowerCase().includes(q) ||
      s.management_ip?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q) ||
      s.notes?.toLowerCase().includes(q)
    )
    .slice(0, MAX_PER_TYPE)
    .map(({ ports: _, ...s }) => s)

  const vlans = vlanRepository.list()
    .filter(v =>
      String(v.vlan_id).includes(q) ||
      v.name.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q) ||
      v.routing_device?.toLowerCase().includes(q)
    )
    .slice(0, MAX_PER_TYPE)

  const networks = networkRepository.list()
    .filter(n =>
      n.name.toLowerCase().includes(q) ||
      n.subnet.toLowerCase().includes(q) ||
      n.description?.toLowerCase().includes(q)
    )
    .slice(0, MAX_PER_TYPE)

  const allocations = ipAllocationRepository.list()
    .filter(a =>
      a.ip_address.includes(q) ||
      a.hostname?.toLowerCase().includes(q) ||
      a.mac_address?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    )
    .slice(0, MAX_PER_TYPE)

  return { switches, vlans, networks, allocations }
})
