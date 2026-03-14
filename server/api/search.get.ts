import { dataStore } from '../storage/data-store'

export default defineEventHandler(async (event) => {
  const q = (getQuery(event).q as string || '').toLowerCase().trim()
  if (!q) {
    return []
  }

  const data = await dataStore.read()
  const staticPages = [
    { type: 'Page', label: 'Dashboard', route: '/dashboard', searchable: 'dashboard operations' },
    { type: 'Page', label: 'Switches', route: '/switches', searchable: 'switches switching' },
    { type: 'Page', label: 'Networks', route: '/networks', searchable: 'networks network vlan ipam' },
    { type: 'Page', label: 'Settings', route: '/settings', searchable: 'settings layouts language' }
  ]

  const switchResults = data.switches.map((item) => ({
    type: 'Switch',
    label: item.name,
    route: `/switches/${item.id}`,
    searchable: `${item.name} ${item.model} ${item.managementIp} ${item.location}`.toLowerCase()
  }))

  const networkResults = data.networks.map((item) => ({
    type: 'Network',
    label: `${item.name} (VLAN ${item.vlanId})`,
    route: `/networks/${item.id}`,
    searchable: `${item.name} ${item.vlanId} ${item.subnet}/${item.prefix}`.toLowerCase()
  }))

  const ipResults = data.ipAllocations.map((item) => ({
    type: 'IP',
    label: `${item.ipAddress} - ${item.hostname}`,
    route: `/networks/${item.networkId}`,
    searchable: `${item.ipAddress} ${item.hostname} ${item.serviceName || ''}`.toLowerCase()
  }))

  return [...staticPages, ...switchResults, ...networkResults, ...ipResults]
    .filter((item) => item.searchable.includes(q))
    .slice(0, 20)
})
