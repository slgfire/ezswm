import { describe, expect, it } from 'vitest'

import { buildCopyConnectionState, buildLagSyncFields, buildPortSaveDiff, buildSidePanelPortPutOptions, getManualCopyConnection } from '../app/utils/sidePanelPortRequests'

describe('sidepanel port PUT site scope', () => {
  it('forwards route siteId in query for scoped switch sub-resource requests', () => {
    const body = { status: 'up' }
    expect(buildSidePanelPortPutOptions(body, 'site-a')).toEqual({
      method: 'PUT',
      body,
      query: { siteId: 'site-a' }
    })
  })

  it('omits query in all-sites mode', () => {
    const body = { status: 'up' }
    expect(buildSidePanelPortPutOptions(body, 'all')).toEqual({
      method: 'PUT',
      body,
      query: undefined
    })
  })
})

describe('LAG sync field selection', () => {
  it('includes helper custom fields in sync payload', () => {
    expect(buildLagSyncFields({
      status: 'up',
      speed: '1G',
      port_mode: 'access',
      access_vlan: 10,
      native_vlan: null,
      tagged_vlans: [],
      connected_device: 'Switch B',
      connected_port: 'Gi1/0/1',
      connected_device_id: 'sw-b',
      connected_allocation_id: null,
      helper_usage: 'participant',
      helper_label: 'Desk 12',
      show_in_helper_list: false
    })).toMatchObject({
      helper_usage: 'participant',
      helper_label: 'Desk 12',
      show_in_helper_list: false
    })
  })

  it('preserves existing sync behavior for optional flags', () => {
    expect(buildLagSyncFields({
      status: 'up',
      speed: '1G',
      port_mode: 'trunk',
      access_vlan: null,
      native_vlan: 1,
      tagged_vlans: [10, 20],
      connected_device: 'Host 1',
      connected_device_id: null,
      connected_allocation_id: 'alloc-1',
      helper_usage: null,
      helper_label: null,
      show_in_helper_list: true,
      add_vlans_to_target_switch: true
    })).toEqual({
      status: 'up',
      speed: '1G',
      port_mode: 'trunk',
      access_vlan: null,
      native_vlan: 1,
      tagged_vlans: [10, 20],
      connected_device: 'Host 1',
      connected_device_id: null,
      connected_allocation_id: 'alloc-1',
      helper_usage: null,
      helper_label: null,
      show_in_helper_list: true,
      add_vlans_to_target_switch: true
    })
  })

  it('never includes connected_port or connected_port_id in LAG sync payload', () => {
    const payload = buildLagSyncFields({
      status: 'up',
      speed: '1G',
      port_mode: 'access',
      access_vlan: 10,
      native_vlan: null,
      tagged_vlans: [],
      connected_device: 'Switch B',
      connected_port: 'Gi1/0/1',
      connected_port_id: 'remote-port-1',
      connected_device_id: 'switch-b',
      connected_allocation_id: null,
      helper_usage: null,
      helper_label: null,
      show_in_helper_list: true
    }) as Record<string, unknown>

    expect(payload.connected_port).toBeUndefined()
    expect(payload.connected_port_id).toBeUndefined()
  })
})

describe('manual copy connection detection', () => {
  it('returns free-text device+port only for manual source connection', () => {
    expect(getManualCopyConnection({
      connected_device: 'Printer Room 2',
      connected_port: 'LAN',
      connected_device_id: null,
      connected_allocation_id: null
    })).toEqual({
      connected_device: 'Printer Room 2',
      connected_port: 'LAN'
    })
  })

  it('skips switch-linked/allocation-linked/empty sources', () => {
    expect(getManualCopyConnection({ connected_device: 'Switch X', connected_device_id: 'sw-1', connected_allocation_id: null })).toBeNull()
    expect(getManualCopyConnection({ connected_device: 'Host', connected_device_id: null, connected_allocation_id: 'alloc-1' })).toBeNull()
    expect(getManualCopyConnection({ connected_device: '', connected_device_id: null, connected_allocation_id: null })).toBeNull()
  })
})

describe('copy connection state for applyCopyFromPort', () => {
  it('prefills manual connection in freetext mode and clears linked selections', () => {
    expect(buildCopyConnectionState({
      connected_device: 'Printer Room 2',
      connected_port: 'LAN',
      connected_device_id: null,
      connected_allocation_id: null
    })).toEqual({
      connectionMode: 'freetext',
      selectedSwitchId: '',
      selectedPortId: '',
      selectedAllocationId: '',
      connected_device: 'Printer Room 2',
      connected_port: 'LAN'
    })
  })

  it('clears all connection data for non-manual source', () => {
    expect(buildCopyConnectionState({
      connected_device: 'Switch X',
      connected_port: 'Gi1/0/1',
      connected_device_id: 'sw-1',
      connected_allocation_id: null
    })).toEqual({
      connectionMode: 'freetext',
      selectedSwitchId: '',
      selectedPortId: '',
      selectedAllocationId: '',
      connected_device: '',
      connected_port: ''
    })

    expect(buildCopyConnectionState({
      connected_device: 'Host',
      connected_port: 'eth0',
      connected_device_id: null,
      connected_allocation_id: 'alloc-1'
    })).toEqual({
      connectionMode: 'freetext',
      selectedSwitchId: '',
      selectedPortId: '',
      selectedAllocationId: '',
      connected_device: '',
      connected_port: ''
    })

    expect(buildCopyConnectionState({
      connected_device: '',
      connected_port: '',
      connected_device_id: null,
      connected_allocation_id: null
    })).toEqual({
      connectionMode: 'freetext',
      selectedSwitchId: '',
      selectedPortId: '',
      selectedAllocationId: '',
      connected_device: '',
      connected_port: ''
    })
  })
})

describe('buildPortSaveDiff', () => {
  const base = {
    status: 'down', speed: '', port_mode: 'access', access_vlan: null, native_vlan: null, tagged_vlans: [],
    connected_device: '', connected_port: '', connected_device_id: null, connected_port_id: null, connected_allocation_id: null,
    description: '', mac_address: '', helper_usage: null, helper_label: null, show_in_helper_list: true
  }

  it('sends only description when untouched null-mode/strings/visibility defaults are in the baseline', () => {
    const diff = buildPortSaveDiff(base, { ...base, description: 'x' })
    expect(diff?.body).toEqual({ description: 'x' })
  })

  it('returns null for equal candidates', () => {
    expect(buildPortSaveDiff(base, { ...base, tagged_vlans: [] }, { baselineSignature: 'a', currentSignature: 'a' })).toBeNull()
  })

  it('emits explicit clears', () => {
    const diff = buildPortSaveDiff({ ...base, description: 'old', helper_label: 'L' }, base)
    expect(diff?.body).toEqual({ description: '', helper_label: null })
  })

  it('scalar status/mac never include VLAN, connection or flag groups', () => {
    const diff = buildPortSaveDiff(base, { ...base, status: 'up', mac_address: 'aa' })
    expect(diff?.body).toEqual({ status: 'up', mac_address: 'aa' })
  })

  it('port mode change sends atomic VLAN group with dependent clears', () => {
    const diff = buildPortSaveDiff({ ...base, port_mode: 'trunk', tagged_vlans: [10] }, { ...base, port_mode: 'access', access_vlan: 5 })
    expect(diff?.body).toEqual({ port_mode: 'access', access_vlan: 5, native_vlan: null, tagged_vlans: [] })
  })

  it('VLAN change on an existing switch link includes dependency IDs and flag', () => {
    const linked = { ...base, connected_device: 'SW', connected_port: 'Gi1', connected_device_id: 's1', connected_port_id: 'p1' }
    const diff = buildPortSaveDiff(linked, { ...linked, access_vlan: 20 })
    expect(diff?.body).toEqual({
      port_mode: 'access', access_vlan: 20, native_vlan: null, tagged_vlans: [],
      connected_device_id: 's1', connected_port_id: 'p1', add_vlans_to_target_switch: true
    })
    expect(diff?.dependencyKeys).toEqual(['connected_device_id', 'connected_port_id'])
  })

  it('connection changed into a switch includes full VLAN group and flag', () => {
    const diff = buildPortSaveDiff(base, { ...base, connected_device: 'SW', connected_port: 'Gi1', connected_device_id: 's1', connected_port_id: 'p1' })
    expect(Object.keys(diff!.body).sort()).toEqual([
      'access_vlan', 'add_vlans_to_target_switch', 'connected_allocation_id', 'connected_device', 'connected_device_id',
      'connected_port', 'connected_port_id', 'native_vlan', 'port_mode', 'tagged_vlans'
    ])
    expect(diff?.body.add_vlans_to_target_switch).toBe(true)
  })

  it('switch to manual/device sends atomic connection group with ID clears', () => {
    const linked = { ...base, connected_device: 'SW', connected_port: 'Gi1', connected_device_id: 's1', connected_port_id: 'p1' }
    const diff = buildPortSaveDiff(linked, { ...base, connected_device: 'Printer' })
    expect(diff?.body).toEqual({
      connected_device: 'Printer', connected_port: '', connected_device_id: null, connected_port_id: null, connected_allocation_id: null
    })
  })

  it('compares nested arrays and poe, dropping undefined candidate keys', () => {
    const b = { ...base, tagged_vlans: [1, 2], poe: { type: 'af', max_watts: 15 } }
    expect(buildPortSaveDiff(b, { ...b, tagged_vlans: [1, 2], poe: { type: 'af', max_watts: 15 } })).toBeNull()
    const diff = buildPortSaveDiff(b, { ...b, tagged_vlans: [1, 3], poe: undefined })
    expect(diff?.body.tagged_vlans).toEqual([1, 3])
    expect('poe' in diff!.body).toBe(false)
  })

  it('LAG sync: description-only is empty, shared changed fields retained', () => {
    const d1 = buildPortSaveDiff(base, { ...base, description: 'x' })!
    expect(buildLagSyncFields(d1.body)).toEqual({})
    const d2 = buildPortSaveDiff(base, { ...base, status: 'up', port_mode: 'trunk', tagged_vlans: [4] })!
    expect(buildLagSyncFields(d2.body)).toMatchObject({ status: 'up', port_mode: 'trunk', tagged_vlans: [4] })
    expect(buildLagSyncFields(d2.body)).not.toHaveProperty('description')
  })
})
