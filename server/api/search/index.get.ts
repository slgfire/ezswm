import { allocationsRepository } from '~/server/repositories/allocations.repository'
import { networksRepository } from '~/server/repositories/networks.repository'
import { switchesRepository } from '~/server/repositories/switches.repository'

export default defineEventHandler(async (event) => {
  const q = (getQuery(event).q?.toString() || '').trim().toLowerCase()
  if (!q) return []

  const [switches, networks, allocations] = await Promise.all([
    switchesRepository.list(event),
    networksRepository.list(event),
    allocationsRepository.list(event)
  ])

  const results = [
    ...switches.filter(item => [item.name, item.vendor, item.model, item.managementIp].some(value => value.toLowerCase().includes(q))).map(item => ({ type: 'switch', id: item.id, label: `${item.name} (${item.managementIp})`, to: `/switches/${item.id}` })),
    ...networks.filter(item => [item.name, String(item.vlanId), item.subnet].some(value => value.toLowerCase().includes(q))).map(item => ({ type: 'network', id: item.id, label: `${item.name} VLAN ${item.vlanId} ${item.subnet}/${item.prefix}`, to: `/networks/${item.id}` })),
    ...allocations.filter(item => [item.ipAddress, item.hostname].some(value => value.toLowerCase().includes(q))).map(item => ({ type: 'allocation', id: item.id, label: `${item.ipAddress} ${item.hostname}`, to: `/networks/${item.networkId}?tab=allocations` }))
  ]

  return results.slice(0, 25)
})
