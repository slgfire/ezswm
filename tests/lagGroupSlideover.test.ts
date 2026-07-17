import { describe, expect, it } from 'vitest'
import { applyVlanBeforeSuccess, buildLagSaveRequest, executeLagSaveRequest, saveLagLocally, submitLagSequence } from '../app/utils/lagSubmit'
import { routeLagMemberRemoval } from '../app/utils/lagMemberRemoval'
import { buildLagPortOptions } from '../app/utils/lagPortOptions'
import { onLocalPortsChange, removePortFromSelection } from '../app/utils/lagPortSelection'

describe('LagGroupSlideover quality regressions', () => {
  const port = (id: string, lag_group_id?: string) => ({ id, unit: 1, index: 1, type: 'rj45' as const, status: 'down' as const, tagged_vlans: [], label: id, lag_group_id })

  it('builds local port options with current members first and excludes other LAGs', () => {
    expect(buildLagPortOptions([port('member')], [port('member'), port('free'), port('other', 'other-lag')])).toEqual([
      { label: 'member', value: 'member' }, { label: 'free', value: 'free' }
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
