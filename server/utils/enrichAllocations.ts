import type { IPAllocation, IpAllocationEnriched } from '../../types/ipAllocation'
import type { Network } from '../../types/network'
import type { VLAN } from '../../types/vlan'
import type { Site } from '../../types/site'

/**
 * Joins IP allocations with their network, VLAN and site.
 * Allocations whose network is not in `networks` are dropped (site scoping).
 */
export function enrichAllocations(
  allocations: IPAllocation[],
  networks: Network[],
  vlans: VLAN[],
  sites: Site[]
): IpAllocationEnriched[] {
  const networkMap = new Map(networks.map(n => [n.id, n]))
  const vlanMap = new Map(vlans.map(v => [v.id, v]))
  const siteMap = new Map(sites.map(s => [s.id, s]))

  const result: IpAllocationEnriched[] = []
  for (const alloc of allocations) {
    const network = networkMap.get(alloc.network_id)
    if (!network) continue

    const vlan = network.vlan_id ? vlanMap.get(network.vlan_id) ?? null : null
    const site = siteMap.get(network.site_id) ?? null

    result.push({
      ...alloc,
      site_id: network.site_id,
      site_name: site?.name ?? network.site_id,
      network_name: network.name,
      network_subnet: network.subnet,
      vlan_ref_id: network.vlan_id ?? null,
      vlan_tag: vlan?.vlan_id ?? null,
      vlan_name: vlan?.name ?? null,
      vlan_color: vlan?.color ?? null
    })
  }
  return result
}
