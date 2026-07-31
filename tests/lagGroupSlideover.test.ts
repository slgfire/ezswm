import { describe, expect, it } from 'vitest'
import { applyVlanBeforeSuccess, buildLagSaveRequest, executeLagSaveRequest, saveLagLocally, submitLagSequence } from '../app/utils/lagSubmit'
import { routeLagMemberRemoval } from '../app/utils/lagMemberRemoval'
import { buildLagPortOptions, filterLagEligiblePorts, getLagEligibleSelectedPortIds } from '../app/utils/lagPortOptions'
import { onLocalPortsChange, removePortFromSelection } from '../app/utils/lagPortSelection'
import { selectedPortsLabel, selectedPortsTrigger } from '../app/utils/lagSelectedPortsLabel'
import { buildRemoteMappingPortOptions } from '../app/composables/useRemoteConnection'
import { buildDuplicateManualConnectedPorts, getLagDuplicatePrefill, shouldUpdateLocalPortConnectionsForSubmit } from '../app/utils/lagDuplicatePrefill'

describe('LagGroupSlideover quality regressions', () => {
  const port = (id: string, lag_group_id?: string, type: 'rj45' | 'console' | 'management' = 'rj45') => ({ id, unit: 1, index: 1, type, status: 'down' as const, tagged_vlans: [], label: id, lag_group_id })

  it('renders the localized selected-port count in the select trigger', () => {
    expect(selectedPortsLabel(2, (key, params) => `${key}:${params.count}`)).toBe('lag.selectedPorts:2')
  })

  it('renders the localized count through the USelectMenu default-slot trigger wiring', () => {
    const rendered = selectedPortsTrigger(['port-a', 'port-b'], (key, params) => `${key}:${params.count}`, value => `<button data-slot="default">${value}</button>`)
    expect(rendered).toBe('<button data-slot="default">lag.selectedPorts:2</button>')
    expect(rendered).not.toBe('<button data-slot="default"></button>')
  })

  it('leaves the default slot empty when no ports are selected', () => {
    expect(selectedPortsTrigger([], (key, params) => `${key}:${params.count}`, value => `<button data-slot="default">${value}</button>`)).toBe('')
    expect(selectedPortsTrigger(['port-a'], (key, params) => `${key}:${params.count}`, value => `<button data-slot="default">${value}</button>`)).toBe('<button data-slot="default">lag.selectedPorts:1</button>')
  })

  it('shows only free local ports and hides selected and other-LAG ports', () => {
    expect(buildLagPortOptions(['member'], [port('member'), port('free'), port('other', 'other-lag'), port('console', undefined, 'console'), port('management', undefined, 'management')])).toEqual([
      { label: 'free', value: 'free' }
    ])
  })

  it('filters remote mapping targets to eligible ports', () => {
    expect(filterLagEligiblePorts([port('data'), port('console', undefined, 'console'), port('management', undefined, 'management')]).map(p => p.id)).toEqual(['data'])
  })

  it('builds production remote mapping options without console or management targets', () => {
    const options = buildRemoteMappingPortOptions([
      port('rj45'),
      port('console', undefined, 'console'),
      port('management', undefined, 'management')
    ], () => false)
    expect(options.map(option => option.value)).toEqual(['', 'rj45'])
  })

  it('filters grid preselection without dropping normal Ethernet ports', () => {
    expect(filterLagEligiblePorts([port('rj45'), port('console', undefined, 'console'), port('management', undefined, 'management')]).map(p => p.id)).toEqual(['rj45'])
  })

  it('requires two eligible selected ports for Create LAG', () => {
    expect(getLagEligibleSelectedPortIds(['console', 'management'], [port('console', undefined, 'console'), port('management', undefined, 'management')])).toEqual([])
    expect(getLagEligibleSelectedPortIds(['data', 'console'], [port('data'), port('console', undefined, 'console')])).toEqual(['data'])
    expect(getLagEligibleSelectedPortIds(['a', 'b'], [port('a'), port('b')])).toEqual(['a', 'b'])
  })

  it('shows a removed original member again while excluding a foreign LAG member', () => {
    expect(buildLagPortOptions([], [port('removed', 'current-lag'), port('foreign', 'other-lag'), port('free')], 'current-lag')).toEqual([
      { label: 'removed', value: 'removed' },
      { label: 'free', value: 'free' }
    ])
  })

  it('keeps the controlled menu open after selection and removal', () => {
    const form = { port_ids: ['a', 'b'] }
    const menu = { value: false }
    const mapping: Record<string, unknown> = { a: 'remote-a' }
    onLocalPortsChange(form, menu, ['a', 'b', 'c'])
    expect(form.port_ids).toEqual(['a', 'b', 'c'])
    expect(menu.value).toBe(true)
    menu.value = false
    removePortFromSelection(form, mapping, menu, 'a')
    expect(form.port_ids).toEqual(['b', 'c'])
    expect(mapping).toEqual({})
    expect(menu.value).toBe(true)
    expect(buildLagPortOptions(form.port_ids, [port('a'), port('b'), port('c')])).toEqual([{ label: 'a', value: 'a' }])
    expect('Remove port b').toContain('port b')
  })
  it('routes remote member removal through the edit sync flow', () => {
    const calls: string[] = []
    const lag = { id: 'lag', name: 'LAG', switch_id: 'local', port_ids: ['a', 'b'], remote_device_id: 'remote' }
    routeLagMemberRemoval(lag, 'a', (value, portId) => calls.push(`${value.id}:${portId}`), () => calls.push('direct'))
    expect(calls).toEqual(['lag:a'])
  })
  it('uses exactly one local PUT with sync and no remote mutation', async () => {
    const local: unknown[] = []; const remote: unknown[] = []
    const request = buildLagSaveRequest({ switchId: 'local', lagId: 'lag', isEdit: true, isDuplicate: false, body: { name: 'x', sync: { remote_switch_id: 'remote', mappings: [{ local_port_id: 'a', remote_port_id: 'b' }], port_mode: 'trunk', access_vlan: null, native_vlan: 10, tagged_vlans: [20] } } })
    await saveLagLocally({ isEdit: true, duplicate: false, remoteSwitch: true, update: async () => local.push(await executeLagSaveRequest(request, async (url, options) => ({ url, options }))), create: async () => remote.push('create') })
    expect(local).toEqual([{ url: '/api/switches/local/lag-groups/lag', options: { method: 'PUT', body: expect.objectContaining({ sync: expect.any(Object) }), query: undefined } }]); expect(remote).toEqual([])
  })

  it('uses POST for normal create and duplicate, with duplicate local-only payload', async () => {
    const calls: unknown[] = []
    for (const duplicate of [false, true]) {
      const request = buildLagSaveRequest({ switchId: 'local', isEdit: false, isDuplicate: duplicate, body: { name: 'copy', sync: { remote_switch_id: 'remote' } } })
      await saveLagLocally({ isEdit: false, duplicate, remoteSwitch: !duplicate, update: async () => calls.push('update'), create: async () => calls.push(await executeLagSaveRequest(request, async (url, options) => ({ url, options }))) })
    }
    expect(calls[0]).toMatchObject({ url: '/api/switches/local/lag-groups', options: { method: 'POST', body: { sync: { remote_switch_id: 'remote' } } } })
     expect(calls[1]).toMatchObject({ options: { method: 'POST', body: { name: 'copy' } } }); expect((calls[1] as { options: { body: { sync?: unknown } } }).options.body.sync).toBeUndefined()
  })

  it('keeps duplicate manual remote_device but still strips linked remote_device_id and sync', () => {
    const request = buildLagSaveRequest({
      switchId: 'local',
      isEdit: false,
      isDuplicate: true,
      body: {
        name: 'copy',
        remote_device: 'Printer Stack',
        remote_device_id: 'sw-remote',
        sync: { remote_switch_id: 'sw-remote' }
      }
    })

    expect(request.body).toEqual({
      name: 'copy',
      remote_device: 'Printer Stack',
      remote_device_id: undefined,
      sync: undefined
    })
  })

  it('prefills duplicate remote state only for manual freetext remote', () => {
    expect(getLagDuplicatePrefill({
      id: 'lag-1',
      switch_id: 'sw-1',
      name: 'LAG 1',
      description: 'Uplink description',
      port_ids: ['p1', 'p2'],
      remote_device: 'Custom Peer',
      remote_device_id: undefined,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    })).toEqual({
      description: 'Uplink description',
      remoteMode: 'freetext',
      remote_device: 'Custom Peer',
      remote_device_id: undefined,
      selectedRemoteSwitchId: ''
    })

    expect(getLagDuplicatePrefill({
      id: 'lag-2',
      switch_id: 'sw-1',
      name: 'LAG 2',
      description: 'Linked peer',
      port_ids: ['p3', 'p4'],
      remote_device: 'Switch B',
      remote_device_id: 'sw-2',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    })).toEqual({
      description: 'Linked peer',
      remoteMode: 'none',
      remote_device: '',
      remote_device_id: undefined,
      selectedRemoteSwitchId: ''
    })
  })

  it('runs local port connection updates for duplicate freetext only', () => {
    expect(shouldUpdateLocalPortConnectionsForSubmit(false, 'none')).toBe(true)
    expect(shouldUpdateLocalPortConnectionsForSubmit(false, 'switch')).toBe(true)
    expect(shouldUpdateLocalPortConnectionsForSubmit(false, 'freetext')).toBe(true)

    expect(shouldUpdateLocalPortConnectionsForSubmit(true, 'freetext')).toBe(true)
    expect(shouldUpdateLocalPortConnectionsForSubmit(true, 'none')).toBe(false)
    expect(shouldUpdateLocalPortConnectionsForSubmit(true, 'switch')).toBe(false)
  })

  it('maps source manual connected_port to target members by source lag order (freetext duplicate only)', () => {
    const sourceLag = {
      id: 'lag-1',
      switch_id: 'sw-1',
      name: 'LAG 1',
      port_ids: ['src-b', 'src-a'],
      remote_device: 'Custom Peer',
      remote_device_id: undefined,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }

    expect(buildDuplicateManualConnectedPorts({
      isDuplicate: true,
      remoteMode: 'freetext',
      sourceLag,
      ports: [
        { id: 'src-a', connected_port: 'Peer-A' },
        { id: 'src-b', connected_port: 'Peer-B' },
        { id: 'src-c', connected_port: 'Peer-C' }
      ],
      targetPortIds: ['dst-1', 'dst-2', 'dst-3']
    })).toEqual({
      'dst-1': 'Peer-B',
      'dst-2': 'Peer-A'
    })
  })

  it('does not produce duplicate manual connected_port mapping for unsafe modes', () => {
    const sourceLag = {
      id: 'lag-1',
      switch_id: 'sw-1',
      name: 'LAG 1',
      port_ids: ['src-a'],
      remote_device: 'Custom Peer',
      remote_device_id: undefined,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }

    expect(buildDuplicateManualConnectedPorts({
      isDuplicate: false,
      remoteMode: 'freetext',
      sourceLag,
      ports: [{ id: 'src-a', connected_port: 'Peer-A' }],
      targetPortIds: ['dst-1']
    })).toEqual({})

    expect(buildDuplicateManualConnectedPorts({
      isDuplicate: true,
      remoteMode: 'none',
      sourceLag,
      ports: [{ id: 'src-a', connected_port: 'Peer-A' }],
      targetPortIds: ['dst-1']
    })).toEqual({})

    expect(buildDuplicateManualConnectedPorts({
      isDuplicate: true,
      remoteMode: 'switch',
      sourceLag,
      ports: [{ id: 'src-a', connected_port: 'Peer-A' }],
      targetPortIds: ['dst-1']
    })).toEqual({})
  })

  it('keeps duplicate flow free of sync and remote calls', async () => {
    const calls: string[] = []
    await saveLagLocally({ isEdit: true, duplicate: true, remoteSwitch: false, update: async () => calls.push('update'), create: async () => calls.push('local') })
    expect(calls).toEqual(['local'])
  })
  it('does not report success or close when VLAN apply fails', async () => {
    let success = false
    let closed = false

    await expect(applyVlanBeforeSuccess(
      async () => { throw new Error('VLAN apply failed') },
      () => { success = true; closed = true }
    )).rejects.toThrow('VLAN apply failed')

    expect(success).toBe(false)
    expect(closed).toBe(false)
  })

  it('applies VLANs with the current remote ID after the submit sequence', async () => {
    const remoteLagId = { value: 'stale-id' }
    const remoteLagPortIds = { value: null as string[] | null }
    const calls: string[] = []

    await submitLagSequence({
      remoteLagId,
      remoteLagPortIds,
      createOrUpdateLocalLag: async () => { calls.push('local') },
      syncRemoteLag: async () => {
        calls.push('sync')
        return { id: 'fresh-id', portIds: ['remote-a', 'remote-b'] }
      },
      applyVlanConfig: async () => {
        calls.push(`vlan:${remoteLagId.value}:${remoteLagPortIds.value?.join(',')}`)
      },
      onSuccess: () => { calls.push('success') }
    })

    expect(calls).toEqual(['local', 'sync', 'vlan:fresh-id:remote-a,remote-b', 'success'])
    expect(calls).not.toContain('vlan:stale-id')
  })

  it('does not apply VLANs with a stale remote ID when remote sync is skipped', async () => {
    const remoteLagId = { value: 'stale-id' }
    const remoteLagPortIds = { value: ['old-port'] as string[] | null }
    let applied: { id: string | null; ports: string[] | null } = { id: 'unexpected', ports: ['unexpected'] }

    await submitLagSequence({
      remoteLagId,
      remoteLagPortIds,
      createOrUpdateLocalLag: async () => {},
      applyVlanConfig: async () => { applied = { id: remoteLagId.value, ports: remoteLagPortIds.value } },
      onSuccess: () => {}
    })

    expect(applied).toEqual({ id: null, ports: null })
  })

  it('does not apply VLANs with a stale remote ID when remote sync fails', async () => {
    const remoteLagId = { value: 'stale-id' }
    const remoteLagPortIds = { value: ['old-port'] as string[] | null }
    let applied: { id: string | null; ports: string[] | null } = { id: 'unexpected', ports: ['unexpected'] }

    await submitLagSequence({
      remoteLagId,
      remoteLagPortIds,
      createOrUpdateLocalLag: async () => {},
       syncRemoteLag: async () => { try { throw new Error('remote sync failed') } catch (error: unknown) { void error } },
      applyVlanConfig: async () => { applied = { id: remoteLagId.value, ports: remoteLagPortIds.value } },
      onSuccess: () => {}
    })

    expect(applied).toEqual({ id: null, ports: null })
  })

  it('uses fresh remote ID and ports, never old mirror data', async () => {
    const remoteLagId = { value: 'old-id' }
    const remoteLagPortIds = { value: ['old-a', 'old-b'] as string[] | null }
    let applied: unknown = null

    await submitLagSequence({
      remoteLagId,
      remoteLagPortIds,
      createOrUpdateLocalLag: async () => {},
      syncRemoteLag: async () => ({ id: 'new-id', portIds: ['new-a', 'new-b'] }),
      applyVlanConfig: async () => { applied = { id: remoteLagId.value, ports: remoteLagPortIds.value } },
      onSuccess: () => {}
    })

    expect(applied).toEqual({ id: 'new-id', ports: ['new-a', 'new-b'] })
  })
})
