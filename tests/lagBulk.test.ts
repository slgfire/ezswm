import { describe, expect, it } from 'vitest'
import { buildCopyUpdates, completeLagId } from '../app/utils/lagBulk'
import { safeCopyTargetIds } from '../app/utils/lagCopyTargets'

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

  it('rejects copy when a selected target is a LAG member without targeting other members', () => {
    expect(safeCopyTargetIds('a', ['a', 'c'], ports)).toEqual(['c'])
    expect(safeCopyTargetIds('c', ['c', 'a'], ports)).toBeNull()
  })

  it('builds only the port configuration copy payload', () => {
    const source = {
      id: 'source',
      status: 'up',
      tagged_vlans: [],
      connected_device: 'device',
      connected_device_id: 'device-id',
       connected_port: 'port',
       connected_port_id: 'port-id',
       connected_allocation_id: 'allocation-id',
       lag_group_id: 'lag-id'
    }

    expect(buildCopyUpdates(source)).toEqual({
      status: 'up',
      speed: null,
      port_mode: null,
      access_vlan: null,
      native_vlan: null,
      description: null,
      helper_usage: null,
      tagged_vlans: []
    })
    expect(Object.keys(buildCopyUpdates(source))).not.toEqual(expect.arrayContaining([
      'connected_device', 'connected_device_id', 'connected_port', 'connected_port_id',
      'connected_allocation_id', 'lag_group_id'
    ]))
  })
})
