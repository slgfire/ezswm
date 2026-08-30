import { describe, expect, it } from 'vitest'

import { buildCopyConnectionState, buildLagSyncFields, buildSidePanelPortPutOptions, getManualCopyConnection } from '../app/utils/sidePanelPortRequests'

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
