import { switchRepository } from '../repositories/switchRepository'
import { vlanRepository } from '../repositories/vlanRepository'
import { networkRepository } from '../repositories/networkRepository'
import { ipAllocationRepository } from '../repositories/ipAllocationRepository'
import { layoutTemplateRepository } from '../repositories/layoutTemplateRepository'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const q = String(query.q || '').toLowerCase().trim()
  const siteId = query.site_id as string | undefined

  if (!q || q.length < 2) {
    return { switches: [], vlans: [], networks: [], allocations: [], templates: [] }
  }

  const MAX_PER_TYPE = 10

  const allSwitches = switchRepository.list()
  const switches = (siteId ? allSwitches.filter(s => s.site_id === siteId) : allSwitches)
    .filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.model?.toLowerCase().includes(q) ||
      s.manufacturer?.toLowerCase().includes(q) ||
      s.serial_number?.toLowerCase().includes(q) ||
      s.management_ip?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q) ||
      s.role?.toLowerCase().includes(q) ||
      s.tags?.some(t => t.toLowerCase().includes(q)) ||
      s.firmware_version?.toLowerCase().includes(q) ||
      s.notes?.toLowerCase().includes(q)
    )
    .slice(0, MAX_PER_TYPE)
    .map(({ ports: _, ...s }) => s)

  const allVlans = vlanRepository.list()
  const vlans = (siteId ? allVlans.filter(v => v.site_id === siteId) : allVlans)
    .filter(v =>
      String(v.vlan_id).includes(q) ||
      v.name.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q) ||
      v.routing_device?.toLowerCase().includes(q)
    )
    .slice(0, MAX_PER_TYPE)

  const allNetworks = networkRepository.list()
  const networks = (siteId ? allNetworks.filter(n => n.site_id === siteId) : allNetworks)
    .filter(n =>
      n.name.toLowerCase().includes(q) ||
      n.subnet.toLowerCase().includes(q) ||
      n.gateway?.toLowerCase().includes(q) ||
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

  const templates = layoutTemplateRepository.list()
    .filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.manufacturer?.toLowerCase().includes(q) ||
      t.model?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    )
    .slice(0, MAX_PER_TYPE)
    .map(({ units: _, ...t }) => t)

  return { switches, vlans, networks, allocations, templates }
})
