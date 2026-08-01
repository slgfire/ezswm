import { describe, expect, it } from 'vitest'

import { buildCopyPrefill } from '../app/utils/lagBulk'
import type { Port } from '../types/port'

describe('lagBulk copy prefill contract', () => {
  it('copies only allowed bulk prefill fields and excludes description/identity/connection/LAG', () => {
    const source: Port = {
      id: 'p1',
      unit: 1,
      index: 1,
      label: 'Gi1/0/1',
      type: 'rj45',
      status: 'up',
      speed: '1G',
      port_mode: 'trunk',
      access_vlan: undefined,
      native_vlan: undefined,
      tagged_vlans: [10, 20],
      description: 'do not copy',
      mac_address: 'AA:BB:CC:DD:EE:FF',
      connected_device: 'Device A',
      connected_device_id: 'sw-2',
      connected_port_id: 'p9',
      connected_port: 'Gi1/0/9',
      connected_allocation_id: 'alloc-1',
      lag_group_id: 'lag-1',
      poe: { type: '802.3at', max_watts: 30 },
      helper_usage: 'ap',
      helper_label: 'AP room 1',
      show_in_helper_list: false
    }

    const prefill = buildCopyPrefill(source)

    expect(prefill).toEqual({
      status: 'up',
      speed: '1G',
      port_mode: 'trunk',
      access_vlan: null,
      native_vlan: null,
      tagged_vlans: [10, 20],
      poe_selection: '802.3at',
      helper_usage: 'ap',
      helper_label: 'AP room 1',
      show_in_helper_list: false
    })

    expect((prefill as Record<string, unknown>).description).toBeUndefined()
    expect((prefill as Record<string, unknown>).id).toBeUndefined()
    expect((prefill as Record<string, unknown>).label).toBeUndefined()
    expect((prefill as Record<string, unknown>).mac_address).toBeUndefined()
    expect((prefill as Record<string, unknown>).connected_device).toBeUndefined()
    expect((prefill as Record<string, unknown>).connected_allocation_id).toBeUndefined()
    expect((prefill as Record<string, unknown>).lag_group_id).toBeUndefined()
  })

  it('preserves explicit clear values', () => {
    const source: Pick<Port, 'status' | 'speed' | 'port_mode' | 'access_vlan' | 'native_vlan' | 'tagged_vlans' | 'poe' | 'helper_usage' | 'helper_label' | 'show_in_helper_list'> = {
      status: 'down',
      speed: undefined,
      port_mode: undefined,
      access_vlan: undefined,
      native_vlan: undefined,
      tagged_vlans: [],
      poe: null,
      helper_usage: undefined,
      helper_label: undefined,
      show_in_helper_list: false
    }

    const prefill = buildCopyPrefill(source)
    expect(prefill.access_vlan).toBeNull()
    expect(prefill.native_vlan).toBeNull()
    expect(prefill.tagged_vlans).toEqual([])
    expect(prefill.poe_selection).toBeNull()
    expect(prefill.show_in_helper_list).toBe(false)
  })
})
