import { enrichAllocations } from '../server/utils/enrichAllocations'
import type { IPAllocation } from '../types/ipAllocation'
import type { Network } from '../types/network'
import type { VLAN } from '../types/vlan'
import type { Site } from '../types/site'

const TS = '2026-01-01T00:00:00Z'

function alloc(over: Partial<IPAllocation> = {}): IPAllocation {
  return {
    id: 'a1',
    network_id: 'net-1',
    ip_address: '10.0.1.10',
    status: 'active',
    created_at: TS,
    updated_at: TS,
    ...over
  }
}

function network(over: Partial<Network> = {}): Network {
  return {
    id: 'net-1',
    site_id: 'site-1',
    name: 'LAN',
    subnet: '10.0.1.0/24',
    dns_servers: [],
    is_favorite: false,
    created_at: TS,
    updated_at: TS,
    ...over
  }
}

function vlan(over: Partial<VLAN> = {}): VLAN {
  return {
    id: 'vlan-1',
    site_id: 'site-1',
    vlan_id: 100,
    name: 'Servers',
    status: 'active',
    color: '#EF4444',
    is_favorite: false,
    created_at: TS,
    updated_at: TS,
    ...over
  }
}

const sites: Site[] = [{ id: 'site-1', name: 'HQ', created_at: TS, updated_at: TS }]

describe('enrichAllocations', () => {
  it('joins allocation with network, VLAN and site', () => {
    const result = enrichAllocations(
      [alloc()],
      [network({ vlan_id: 'vlan-1' })],
      [vlan()],
      sites
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'a1',
      site_id: 'site-1',
      site_name: 'HQ',
      network_name: 'LAN',
      network_subnet: '10.0.1.0/24',
      vlan_ref_id: 'vlan-1',
      vlan_tag: 100,
      vlan_name: 'Servers',
      vlan_color: '#EF4444'
    })
  })

  it('leaves VLAN fields null when the network has no VLAN', () => {
    const result = enrichAllocations([alloc()], [network({ vlan_id: undefined })], [vlan()], sites)
    expect(result[0]).toMatchObject({
      vlan_ref_id: null,
      vlan_tag: null,
      vlan_name: null,
      vlan_color: null
    })
  })

  it('drops allocations whose network is not in the provided list', () => {
    const result = enrichAllocations(
      [alloc({ id: 'a1', network_id: 'net-1' }), alloc({ id: 'a2', network_id: 'other' })],
      [network()],
      [],
      sites
    )
    expect(result.map(r => r.id)).toEqual(['a1'])
  })

  it('falls back to the site id when the site is missing', () => {
    const result = enrichAllocations([alloc()], [network()], [], [])
    expect(result[0]!.site_name).toBe('site-1')
  })
})
