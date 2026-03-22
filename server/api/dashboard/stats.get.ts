import { switchRepository } from '../../repositories/switchRepository'
import { vlanRepository } from '../../repositories/vlanRepository'
import { networkRepository } from '../../repositories/networkRepository'
import { ipAllocationRepository } from '../../repositories/ipAllocationRepository'
import { ipRangeRepository } from '../../repositories/ipRangeRepository'
import { activityRepository } from '../../repositories/activityRepository'
import { parseSubnet } from '../../utils/ipv4'

export default defineEventHandler(() => {
  const switches = switchRepository.list()
  const vlans = vlanRepository.list()
  const networks = networkRepository.list()
  const allocations = ipAllocationRepository.list()
  const ranges = ipRangeRepository.list()
  const { entries: recentActivity } = activityRepository.list(10)

  // Port status counts
  let portsUp = 0, portsDown = 0, portsDisabled = 0
  for (const sw of switches) {
    for (const port of sw.ports) {
      if (port.status === 'up') portsUp++
      else if (port.status === 'down') portsDown++
      else portsDisabled++
    }
  }

  // Network utilization
  const vlanMap = new Map(vlans.map(v => [v.id, v]))
  const networkUtilization = networks.map(n => {
    const info = parseSubnet(n.subnet)
    const allocated = allocations.filter(a => a.network_id === n.id).length
    const rangeCount = ranges.filter(r => r.network_id === n.id).length
    const percentage = info.usable_hosts > 0 ? Math.round((allocated / info.usable_hosts) * 100) : 0
    const vlan = n.vlan_id ? vlanMap.get(n.vlan_id) : null
    return {
      id: n.id,
      name: n.name,
      subnet: n.subnet,
      total_hosts: info.usable_hosts,
      allocated,
      ranges: rangeCount,
      percentage,
      vlan_color: vlan?.color || null,
      vlan_name: vlan?.name || null,
      vlan_id: vlan?.vlan_id || null
    }
  })

  // Orphan VLANs (no networks)
  const vlansWithNetworks = new Set(networks.filter(n => n.vlan_id).map(n => n.vlan_id))
  const orphanVlans = vlans.filter(v => !vlansWithNetworks.has(v.id))

  // High usage networks (>80%)
  const highUsageNetworks = networkUtilization.filter(n => n.percentage > 80)

  // Duplicate IPs
  const ipCounts = new Map<string, number>()
  for (const a of allocations) {
    ipCounts.set(a.ip_address, (ipCounts.get(a.ip_address) || 0) + 1)
  }
  const duplicateIps = [...ipCounts.entries()]
    .filter(([_, count]) => count > 1)
    .map(([ip]) => ip)

  // Favorites
  const favoriteSwitches = switches.filter(s => s.is_favorite).map(({ ports: _, ...s }) => s)
  const favoriteNetworks = networks.filter(n => n.is_favorite)

  return {
    counts: {
      switches: switches.length,
      vlans: vlans.length,
      networks: networks.length,
      allocations: allocations.length
    },
    portStatus: { up: portsUp, down: portsDown, disabled: portsDisabled },
    networkUtilization,
    orphanVlans: orphanVlans.map(v => ({ id: v.id, vlan_id: v.vlan_id, name: v.name })),
    highUsageNetworks,
    duplicateIps,
    favorites: { switches: favoriteSwitches, networks: favoriteNetworks },
    recentActivity
  }
})
