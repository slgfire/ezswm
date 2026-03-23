import { vlanRepository } from '../../../repositories/vlanRepository'
import { networkRepository } from '../../../repositories/networkRepository'
import { switchRepository } from '../../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing VLAN ID' })
  }

  const vlan = vlanRepository.getById(id)

  if (!vlan) {
    throw createError({ statusCode: 404, statusMessage: 'VLAN not found' })
  }

  // Find networks referencing this VLAN
  const networks = networkRepository.list().filter((n) => n.vlan_id === id)

  // Find ports using this VLAN as native_vlan or in tagged_vlans
  const switches = switchRepository.list()
  const ports: Array<{
    switch_id: string
    switch_name: string
    port_id: string
    port_label: string
    usage: 'native' | 'tagged'
  }> = []

  for (const sw of switches) {
    for (const port of sw.ports) {
      if (port.native_vlan === vlan.vlan_id) {
        ports.push({
          switch_id: sw.id,
          switch_name: sw.name,
          port_id: port.id,
          port_label: port.label || `${port.unit}/${port.index}`,
          usage: 'native',
        })
      }
      if (port.tagged_vlans && port.tagged_vlans.includes(vlan.vlan_id)) {
        ports.push({
          switch_id: sw.id,
          switch_name: sw.name,
          port_id: port.id,
          port_label: port.label || `${port.unit}/${port.index}`,
          usage: 'tagged',
        })
      }
    }
  }

  return {
    networks,
    ports,
  }
})
