import { describe, it, expect } from 'vitest'
import { buildIdMap, remapJson, mergeIdMaps } from '../server/utils/idMapping'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('buildIdMap', () => {
  it('mints a UUIDv4 for every id', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const map = buildIdMap(items)

    expect(map.size).toBe(3)
    for (const id of ['a', 'b', 'c']) {
      expect(map.has(id)).toBe(true)
      expect(map.get(id)).toMatch(UUID_RE)
    }
    expect(new Set(map.values()).size).toBe(3)
  })

  it('deduplicates repeated ids', () => {
    const map = buildIdMap([{ id: 'x' }, { id: 'x' }, { id: 'y' }])
    expect(map.size).toBe(2)
  })

  it('returns empty map for empty input', () => {
    expect(buildIdMap([]).size).toBe(0)
  })
})

describe('remapJson', () => {
  const map = new Map<string, string>([
    ['old-site', 'new-site'],
    ['old-net', 'new-net'],
    ['old-port-1', 'new-port-1'],
    ['old-port-2', 'new-port-2'],
    ['old-vlan', 'new-vlan']
  ])

  it('rewrites top-level id', () => {
    expect(remapJson({ id: 'old-site' }, map)).toEqual({ id: 'new-site' })
  })

  it('rewrites *_id foreign keys', () => {
    const result = remapJson({ site_id: 'old-site', network_id: 'old-net' }, map)
    expect(result).toEqual({ site_id: 'new-site', network_id: 'new-net' })
  })

  it('rewrites elements of *_ids arrays', () => {
    const result = remapJson({ port_ids: ['old-port-1', 'old-port-2'] }, map)
    expect(result).toEqual({ port_ids: ['new-port-1', 'new-port-2'] })
  })

  it('leaves array elements unmapped if no entry exists', () => {
    const result = remapJson({ port_ids: ['unknown', 'old-port-1'] }, map)
    expect(result).toEqual({ port_ids: ['unknown', 'new-port-1'] })
  })

  it('leaves non-id string fields alone even if they coincidentally match', () => {
    const result = remapJson({ name: 'old-site', description: 'old-net' }, map)
    expect(result).toEqual({ name: 'old-site', description: 'old-net' })
  })

  it('does not touch number arrays like tagged_vlans / configured_vlans', () => {
    const input = { tagged_vlans: [10, 20, 30], configured_vlans: [10] }
    expect(remapJson(input, map)).toEqual(input)
  })

  it('recurses into nested objects and arrays', () => {
    const input = {
      site_id: 'old-site',
      ports: [
        { id: 'old-port-1', label: 'eth0' },
        { id: 'old-port-2', connected_port_id: 'old-port-1' }
      ],
      meta: { changes: { vlan_id: 'old-vlan' } }
    }
    expect(remapJson(input, map)).toEqual({
      site_id: 'new-site',
      ports: [
        { id: 'new-port-1', label: 'eth0' },
        { id: 'new-port-2', connected_port_id: 'new-port-1' }
      ],
      meta: { changes: { vlan_id: 'new-vlan' } }
    })
  })

  it('passes through null, undefined, primitives unchanged', () => {
    expect(remapJson(null, map)).toBe(null)
    expect(remapJson(undefined, map)).toBe(undefined)
    expect(remapJson(42, map)).toBe(42)
    expect(remapJson('plain string', map)).toBe('plain string')
    expect(remapJson(true, map)).toBe(true)
  })

  it('leaves unknown ids unchanged', () => {
    expect(remapJson({ id: 'never-seen' }, map)).toEqual({ id: 'never-seen' })
  })
})

describe('mergeIdMaps', () => {
  it('combines multiple maps into one', () => {
    const a = new Map([['a1', 'A1']])
    const b = new Map([['b1', 'B1'], ['b2', 'B2']])
    const merged = mergeIdMaps(a, b)
    expect(merged.size).toBe(3)
    expect(merged.get('a1')).toBe('A1')
    expect(merged.get('b1')).toBe('B1')
    expect(merged.get('b2')).toBe('B2')
  })

  it('later maps win on collision', () => {
    const a = new Map([['k', 'first']])
    const b = new Map([['k', 'second']])
    expect(mergeIdMaps(a, b).get('k')).toBe('second')
  })
})
