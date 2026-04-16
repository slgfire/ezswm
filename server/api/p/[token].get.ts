import { publicTokenRepository } from '../../repositories/publicTokenRepository'
import { switchRepository } from '../../repositories/switchRepository'
import { vlanRepository } from '../../repositories/vlanRepository'
import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'
import { siteRepository } from '../../repositories/siteRepository'
import type { Port } from '~~/types/port'
import type { LayoutUnit } from '~~/types/layoutTemplate'

export default defineEventHandler(async (event) => {
  const tokenStr = event.context.params?.token
  if (!tokenStr) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const tokenRecord = publicTokenRepository.getByToken(tokenStr)
  if (!tokenRecord) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const sw = switchRepository.getById(tokenRecord.switch_id)
  if (!sw) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  // Update last access
  publicTokenRepository.updateLastAccess(tokenRecord.id)

  // Load site name
  const site = siteRepository.getById(sw.site_id)
  const siteName = site?.name ?? null

  // Load VLANs scoped to switch's site
  const allVlans = vlanRepository.list()
  const siteVlans = allVlans.filter(v => v.site_id === sw.site_id)

  // Collect VLAN IDs used by this switch's ports
  const usedVlanIds = new Set<number>()
  for (const port of sw.ports) {
    if (port.access_vlan) usedVlanIds.add(port.access_vlan)
    if (port.native_vlan) usedVlanIds.add(port.native_vlan)
    for (const vid of port.tagged_vlans) {
      usedVlanIds.add(vid)
    }
  }

  // Build public VLANs (only used ones)
  const publicVlans = siteVlans
    .filter(v => usedVlanIds.has(v.vlan_id))
    .map(v => ({ vlan_id: v.vlan_id, name: v.name, color: v.color }))

  // Build public ports (strip sensitive fields, synthetic IDs)
  const publicPorts = sw.ports.map((port: Port, i: number) => ({
    id: `p-${i}`,
    unit: port.unit,
    index: port.index,
    label: port.label,
    type: port.type,
    speed: port.speed,
    status: port.status,
    port_mode: port.port_mode,
    access_vlan: port.access_vlan,
    native_vlan: port.native_vlan,
    tagged_vlans: port.tagged_vlans,
    connected_device: port.connected_device,
    description: port.description,
    poe: port.poe ?? null,
    is_uplink: !!port.connected_device_id,
    helper_usage: port.helper_usage,
    helper_label: port.helper_label,
    show_in_helper_list: port.show_in_helper_list
  }))

  // Build public layout units (synthetic block IDs)
  let publicUnits: { unit_number: number; label?: string; blocks: { id: string; type: string; count: number; start_index: number; rows: number; row_layout?: string; label?: string }[] }[] = []
  if (sw.layout_template_id) {
    const template = layoutTemplateRepository.getById(sw.layout_template_id)
    if (template) {
      publicUnits = template.units.map((unit: LayoutUnit) => ({
        unit_number: unit.unit_number,
        label: unit.label,
        blocks: unit.blocks.map((block, bi) => ({
          id: `blk-${unit.unit_number}-${bi}`,
          type: block.type,
          count: block.count,
          start_index: block.start_index,
          rows: block.rows,
          row_layout: block.row_layout,
          label: block.label
        }))
      }))
    }
  }

  // Set security headers
  setHeader(event, 'X-Robots-Tag', 'noindex')
  setHeader(event, 'Cache-Control', 'no-store')

  return {
    name: sw.name,
    model: sw.model ?? null,
    location: sw.location ?? null,
    site_name: siteName,
    updated_at: sw.updated_at,
    ports: publicPorts,
    vlans: publicVlans,
    units: publicUnits
  }
})
