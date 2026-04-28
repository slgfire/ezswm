import { switchRepository } from '../repositories/switchRepository'
import { vlanRepository } from '../repositories/vlanRepository'
import { networkRepository } from '../repositories/networkRepository'
import { ipAllocationRepository } from '../repositories/ipAllocationRepository'
import { layoutTemplateRepository } from '../repositories/layoutTemplateRepository'
import { lagGroupRepository } from '../repositories/lagGroupRepository'
import { ipRangeRepository } from '../repositories/ipRangeRepository'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const q = String(query.q || '').toLowerCase().trim()
  const siteId = query.site_id as string | undefined

  if (!q || q.length < 2) {
    return { switches: [], vlans: [], networks: [], allocations: [], ranges: [], templates: [], lagGroups: [] }
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

  const allLagGroups = lagGroupRepository.list()
  const lagGroups = allLagGroups
    .filter(lg => {
      if (siteId) {
        const sw = allSwitches.find(s => s.id === lg.switch_id)
        if (!sw || sw.site_id !== siteId) return false
      }
      return (
        lg.name.toLowerCase().includes(q) ||
        lg.description?.toLowerCase().includes(q) ||
        lg.remote_device?.toLowerCase().includes(q)
      )
    })
    .slice(0, MAX_PER_TYPE)
    .map(lg => {
      const sw = allSwitches.find(s => s.id === lg.switch_id)
      return {
        id: lg.id,
        name: lg.name,
        switch_id: lg.switch_id,
        switch_name: sw?.name || '',
        site_id: sw?.site_id || '',
        port_count: lg.port_ids.length,
        remote_device: lg.remote_device,
        description: lg.description,
      }
    })

  const ranges = ipRangeRepository.list()
    .filter(r => {
      const net = allNetworks.find(n => n.id === r.network_id)
      return (
        r.start_ip.includes(q) ||
        r.end_ip.includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        net?.name.toLowerCase().includes(q)
      )
    })
    .slice(0, MAX_PER_TYPE)
    .map(r => {
      const net = allNetworks.find(n => n.id === r.network_id)
      return { ...r, network_name: net?.name || '', network_id: r.network_id, site_id: net?.site_id || '' }
    })

  return { switches, vlans, networks, allocations, ranges, templates, lagGroups }
})
