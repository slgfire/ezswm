import { switchRepository } from '../repositories/switchRepository'

export default defineEventHandler(() => {
  const switches = switchRepository.list()

  const nodes = switches.map(sw => ({
    id: sw.id,
    name: sw.name,
    model: sw.model,
    location: sw.location,
    port_count: sw.ports.length,
    ports_up: sw.ports.filter(p => p.status === 'up').length
  }))

  const links: Array<{
    source_switch_id: string
    source_port_id: string
    source_port_label: string
    target_switch_id: string
    target_port_id: string
    target_port_label: string
    vlans: number[]
  }> = []

  const seen = new Set<string>()

  for (const sw of switches) {
    for (const port of sw.ports) {
      if (port.connected_device_id && port.connected_port_id) {
        const linkKey = [sw.id, port.connected_device_id].sort().join('-')
        if (!seen.has(linkKey)) {
          seen.add(linkKey)
          const vlans = [...(port.tagged_vlans || [])]
          if (port.native_vlan) vlans.push(port.native_vlan)
          links.push({
            source_switch_id: sw.id,
            source_port_id: port.id,
            source_port_label: port.label || `${port.unit}/${port.index}`,
            target_switch_id: port.connected_device_id,
            target_port_id: port.connected_port_id,
            target_port_label: port.connected_port || '',
            vlans: [...new Set(vlans)]
          })
        }
      }
    }
  }

  return { nodes, links }
})
