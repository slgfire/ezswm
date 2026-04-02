import { switchRepository } from '../../../../../repositories/switchRepository'
import { ipAllocationRepository } from '../../../../../repositories/ipAllocationRepository'
import { networkRepository } from '../../../../../repositories/networkRepository'

export default defineEventHandler((event) => {
  const networkId = event.context.params?.id
  const allocId = event.context.params?.allocId

  if (!networkId) throw createError({ statusCode: 400, message: 'Network ID required' })
  if (!allocId) throw createError({ statusCode: 400, message: 'Allocation ID required' })

  // Validate parent network exists
  const network = networkRepository.getById(networkId)
  if (!network) throw createError({ statusCode: 404, message: 'Network not found' })

  // Validate allocation exists and belongs to this network
  const allocation = ipAllocationRepository.getById(allocId)
  if (!allocation) throw createError({ statusCode: 404, message: 'Allocation not found' })
  if (allocation.network_id !== networkId) {
    throw createError({ statusCode: 404, message: 'Allocation does not belong to this network' })
  }

  const allSwitches = switchRepository.list()
  const ports: { switch_id: string; switch_name: string; port_id: string; port_label: string }[] = []

  for (const sw of allSwitches) {
    for (const port of sw.ports) {
      if (port.connected_allocation_id === allocId) {
        ports.push({
          switch_id: sw.id,
          switch_name: sw.name,
          port_id: port.id,
          port_label: port.label || `${port.unit}/${port.index}`,
        })
      }
    }
  }

  // Sort by switch name then port label for stable ordering
  ports.sort((a, b) => a.switch_name.localeCompare(b.switch_name) || a.port_label.localeCompare(b.port_label))

  return { ports }
})
