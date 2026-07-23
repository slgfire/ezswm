import { describe, expect, it } from 'vitest'
import { buildBulkSourceOptions, buildBulkUpdates, buildCopyPrefill, completeLagId } from '../app/utils/lagBulk'
import { hasLagTargets } from '../app/utils/lagCopyTargets'

describe('bulk LAG request selection', () => {
  const ports = [
    { id: 'a', lag_group_id: 'lag-1' },
    { id: 'b', lag_group_id: 'lag-1' },
    { id: 'c', lag_group_id: null }
  ] as { id: string; lag_group_id: string | null }[]

  it('sends the LAG ID only for the complete member set', () => {
    expect(completeLagId(['a', 'b'], ports)).toBe('lag-1')
    expect(completeLagId(['a'], ports)).toBeUndefined()
    expect(completeLagId(['a', 'c'], ports)).toBeUndefined()
  })

  it('detects lag targets for copy-prefill apply guard', () => {
    expect(hasLagTargets(['a', 'c'], ports)).toBe(true)
    expect(hasLagTargets(['c'], ports)).toBe(false)
  })

  it('keeps all ports in bulk source options (source can also be a selected target)', () => {
    expect(buildBulkSourceOptions([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' }
    ])).toEqual([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c' }
    ])
  })

  it('builds only copy-contract fields and excludes description/connections/LAG', () => {
    const source = {
      id: 'source',
      status: 'up',
      speed: undefined,
      port_mode: undefined,
      access_vlan: undefined,
      native_vlan: undefined,
      tagged_vlans: [],
      poe: null,
      helper_usage: undefined,
      helper_label: undefined,
      show_in_helper_list: false,
      description: 'do not copy',
      connected_device: 'device',
      connected_device_id: 'device-id',
      connected_port: 'port',
      connected_port_id: 'port-id',
      connected_allocation_id: 'allocation-id',
      lag_group_id: 'lag-id'
    }

    expect(buildCopyPrefill(source)).toEqual({
      status: 'up',
      speed: null,
      port_mode: null,
      access_vlan: null,
      native_vlan: null,
      poe_selection: null,
      helper_usage: null,
      helper_label: null,
      show_in_helper_list: false,
      tagged_vlans: []
    })
    expect(Object.keys(buildCopyPrefill(source))).not.toEqual(expect.arrayContaining([
      'description',
      'connected_device', 'connected_device_id', 'connected_port', 'connected_port_id',
      'connected_allocation_id', 'lag_group_id'
    ]))
  })

  it('keeps mode cleanup authoritative when stale prefill fields exist (trunk->access)', () => {
    const updates = buildBulkUpdates({
      form: {
        status: '',
        speed: '',
        port_mode: 'access',
        access_vlan: 22,
        native_vlan: 99,
        tagged_vlans_str: '100,200',
        description: '',
        helper_usage: '_no_change',
        helper_label: '',
        show_in_helper_list: '_no_change',
        poe_selection: '_no_change'
      },
      selectedTaggedVlans: [100, 200],
      explicitPrefillFields: new Set(['native_vlan', 'tagged_vlans']),
      taggedFromInput: [100, 200],
      poeWatts: {}
    })

    expect(updates.port_mode).toBe('access')
    expect(updates.access_vlan).toBe(22)
    expect(updates.native_vlan).toBeNull()
    expect(updates.tagged_vlans).toEqual([])
  })

  it('keeps mode cleanup authoritative when stale prefill fields exist (access->trunk)', () => {
    const updates = buildBulkUpdates({
      form: {
        status: '',
        speed: '',
        port_mode: 'trunk',
        access_vlan: 33,
        native_vlan: 44,
        tagged_vlans_str: '',
        description: '',
        helper_usage: '_no_change',
        helper_label: '',
        show_in_helper_list: '_no_change',
        poe_selection: '_no_change'
      },
      selectedTaggedVlans: [55],
      explicitPrefillFields: new Set(['access_vlan']),
      taggedFromInput: [],
      poeWatts: {}
    })

    expect(updates.port_mode).toBe('trunk')
    expect(updates.access_vlan).toBeNull()
    expect(updates.native_vlan).toBe(44)
    expect(updates.tagged_vlans).toEqual([55])
  })

  it('does not force helper_usage clear when user leaves _no_change after prefill', () => {
    const updates = buildBulkUpdates({
      form: {
        status: '',
        speed: '',
        port_mode: '',
        access_vlan: null,
        native_vlan: null,
        tagged_vlans_str: '',
        description: '',
        helper_usage: '_no_change',
        helper_label: '',
        show_in_helper_list: '_no_change',
        poe_selection: '_no_change'
      },
      selectedTaggedVlans: [],
      explicitPrefillFields: new Set(['helper_usage']),
      taggedFromInput: [],
      poeWatts: {}
    })

    expect(updates.helper_usage).toBeUndefined()
  })
})
