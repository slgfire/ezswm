import { switchRepository } from '../../../../repositories/switchRepository'
import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { siteRepository } from '../../../../repositories/siteRepository'
import type { TopologyNode, TopologyLink, TopologyGhostNode } from '~~/types/topology'
import type { Port } from '~~/types/port'

function getPortLabel(port: Port): string {
  return port.label || `${port.unit}/${port.index}`
}

function deriveVlans(port: Port): number[] {
  const vlans: number[] = []
  if (port.port_mode === 'access' && port.access_vlan) {
    vlans.push(port.access_vlan)
  } else {
    if (port.tagged_vlans?.length) vlans.push(...port.tagged_vlans)
    if (port.native_vlan) vlans.push(port.native_vlan)
  }
  return [...new Set(vlans)]
}

export default defineEventHandler((event) => {
  const siteId = event.context.params?.siteId
  if (!siteId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }

  if (!siteRepository.getById(siteId)) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }

  const allSwitches = switchRepository.list()
  const siteSwitches = allSwitches.filter(sw => sw.site_id === siteId)
  const siteSwIds = new Set(siteSwitches.map(sw => sw.id))

  // Build nodes
  const nodes: TopologyNode[] = siteSwitches.map(sw => ({
    id: sw.id,
    name: sw.name,
    model: sw.model,
    manufacturer: sw.manufacturer,
    location: sw.location,
    management_ip: sw.management_ip,
    role: sw.role,
    port_count: sw.ports.length,
    ports_up: sw.ports.filter(p => p.status === 'up').length,
    ports_down: sw.ports.filter(p => p.status === 'down').length,
    ports_disabled: sw.ports.filter(p => p.status === 'disabled').length
  }))

  // Build links and ghost nodes
  const links: TopologyLink[] = []
  const ghostNodeMap = new Map<string, TopologyGhostNode>()
  const seenEdges = new Set<string>()

  // Preload LAG groups for this site's switches
  const allLags = lagGroupRepository.list()
  const lagByPortId = new Map<string, { id: string; name: string }>()
  for (const lag of allLags) {
    if (siteSwIds.has(lag.switch_id)) {
      for (const portId of lag.port_ids) {
        lagByPortId.set(`${lag.switch_id}:${portId}`, { id: lag.id, name: lag.name })
      }
    }
  }

  for (const sw of siteSwitches) {
    for (const port of sw.ports) {
      if (!port.connected_device_id || !port.connected_port_id) continue

      const targetId = port.connected_device_id
      const isCrossSite = !siteSwIds.has(targetId)

      // Dedup key: per physical link (sorted by switchId:portId)
      const thisTuple = `${sw.id}:${port.id}`
      const thatTuple = `${targetId}:${port.connected_port_id}`
      const edgeKey = [thisTuple, thatTuple].sort().join('--')
      if (seenEdges.has(edgeKey)) continue
      seenEdges.add(edgeKey)

      // Determine source/target direction
      let sourceSwId: string, sourcePortId: string, sourcePortLabel: string
      let targetSwId: string, targetPortId: string, targetPortLabel: string

      if (isCrossSite) {
        // Cross-site: local switch is always source
        sourceSwId = sw.id
        sourcePortId = port.id
        sourcePortLabel = getPortLabel(port)
        targetSwId = targetId
        targetPortId = port.connected_port_id
        targetPortLabel = port.connected_port || ''
      } else {
        // In-site: lexicographic sort determines direction
        if (thisTuple < thatTuple) {
          sourceSwId = sw.id
          sourcePortId = port.id
          sourcePortLabel = getPortLabel(port)
          targetSwId = targetId
          targetPortId = port.connected_port_id
          targetPortLabel = port.connected_port || ''
        } else {
          sourceSwId = targetId
          sourcePortId = port.connected_port_id
          sourcePortLabel = port.connected_port || ''
          targetSwId = sw.id
          targetPortId = port.id
          targetPortLabel = getPortLabel(port)
        }
      }

      // LAG metadata (source-side)
      const lagInfo = lagByPortId.get(`${sourceSwId}:${sourcePortId}`)

      const linkId = `${sourceSwId}:${sourcePortId}-${targetSwId}:${targetPortId}`

      links.push({
        id: linkId,
        source_switch_id: sourceSwId,
        source_port_id: sourcePortId,
        source_port_label: sourcePortLabel,
        target_switch_id: targetSwId,
        target_port_id: targetPortId,
        target_port_label: targetPortLabel,
        lag_group_id: lagInfo?.id,
        lag_name: lagInfo?.name,
        vlans: deriveVlans(port)
      })

      // Track ghost nodes for cross-site targets
      if (isCrossSite && !ghostNodeMap.has(targetId)) {
        const remoteSw = allSwitches.find(s => s.id === targetId)
        if (remoteSw) {
          const remoteSite = siteRepository.getById(remoteSw.site_id)
          ghostNodeMap.set(targetId, {
            id: remoteSw.id,
            name: remoteSw.name,
            site_id: remoteSw.site_id,
            site_name: remoteSite?.name || remoteSw.site_id
          })
        }
      }
    }
  }

  return {
    nodes,
    links,
    ghost_nodes: Array.from(ghostNodeMap.values())
  }
})
