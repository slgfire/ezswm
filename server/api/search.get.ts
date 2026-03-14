import { repositories } from '../repositories'

export default defineEventHandler(async (event) => {
  const q = (getQuery(event).q as string || '').toLowerCase().trim()
  if (!q) return []

  const [switches, networks, allocations] = await Promise.all([
    repositories.switches.findAll(),
    repositories.networks.findAll(),
    repositories.allocations.findAll()
  ])

  const results = [
    ...switches.filter(sw => [sw.name, sw.model, sw.managementIp].some(v => v.toLowerCase().includes(q))).map(sw => ({
      id: `sw-${sw.id}`,
      type: 'switch',
      title: sw.name,
      subtitle: `${sw.vendor} ${sw.model}`,
      to: `/switches/${sw.id}`
    })),
    ...networks.filter(net => [net.name, String(net.vlanId), net.subnet].some(v => v.toLowerCase().includes(q))).map(net => ({
      id: `net-${net.id}`,
      type: 'network',
      title: `${net.name} (VLAN ${net.vlanId})`,
      subtitle: `${net.subnet}/${net.prefix}`,
      to: `/networks/${net.id}`
    })),
    ...allocations.filter(ip => [ip.ipAddress, ip.hostname].some(v => v.toLowerCase().includes(q))).map(ip => ({
      id: `ip-${ip.id}`,
      type: 'ip',
      title: ip.ipAddress,
      subtitle: ip.hostname,
      to: `/networks/${ip.networkId}`
    })),
    ...[
      { id: 'page-dashboard', type: 'page', title: 'Dashboard', subtitle: 'Operations', to: '/' },
      { id: 'page-switches', type: 'page', title: 'Switches', subtitle: 'Switching', to: '/switches' },
      { id: 'page-networks', type: 'page', title: 'Networks', subtitle: 'Network', to: '/networks' },
      { id: 'page-settings', type: 'page', title: 'Settings', subtitle: 'System', to: '/settings' }
    ].filter(page => page.title.toLowerCase().includes(q))
  ]

  return results.slice(0, 30)
})
