import { describe, expect, it } from 'vitest'

import { collectTopologyNodePositions } from '../app/utils/topologyNodePositions'

const known = new Set(['id-a', 'id-b', 'ghost-1'])
const rec = (nodeId: string | null, transform: string | null) => ({ nodeId, transform })

describe('collectTopologyNodePositions', () => {
  it('keys positions by node ID only: identical or truncated display names cannot collide', () => {
    // Two nodes whose visible label is the same truncated text still produce two distinct, ID-keyed entries.
    const result = collectTopologyNodePositions([
      rec('id-a', 'translate(-100 0)'),
      rec('id-b', 'translate(165 41.053)')
    ], known)
    expect(result).toEqual({ 'id-a': { x: -100, y: 0 }, 'id-b': { x: 165, y: 41.053 } })
    expect(Object.keys(result)).toHaveLength(2)
  })

  it('parses negative and fractional world coordinates', () => {
    expect(collectTopologyNodePositions([rec('id-a', 'translate( -12.5   -0.25 )')], known))
      .toEqual({ 'id-a': { x: -12.5, y: -0.25 } })
  })

  it('a successive full snapshot keeps the previously moved node (cumulative positions)', () => {
    const first = collectTopologyNodePositions([rec('id-a', 'translate(10 10)'), rec('id-b', 'translate(100 0)')], known)
    const second = collectTopologyNodePositions([rec('id-a', 'translate(10 10)'), rec('id-b', 'translate(300 80)')], known)
    expect(first['id-a']).toEqual({ x: 10, y: 10 })
    expect(second).toEqual({ 'id-a': { x: 10, y: 10 }, 'id-b': { x: 300, y: 80 } })
  })

  it('omits records with a missing or unknown ID marker, with no name-based fallback', () => {
    const result = collectTopologyNodePositions([
      rec(null, 'translate(1 1)'),
      rec('', 'translate(2 2)'),
      rec('not-a-known-id', 'translate(3 3)'),
      rec('id-a', 'translate(4 4)')
    ], known)
    expect(result).toEqual({ 'id-a': { x: 4, y: 4 } })
  })

  it('ignores a missing, malformed or non-finite translate', () => {
    const result = collectTopologyNodePositions([
      rec('id-a', null),
      rec('id-b', 'rotate(10)'),
      rec('ghost-1', 'translate(1.2.3 4)')
    ], known)
    expect(result).toEqual({})
  })

  it('supports ghost node IDs when they are part of the known IDs (the server still filters to the site)', () => {
    expect(collectTopologyNodePositions([rec('ghost-1', 'translate(7 -9)')], known))
      .toEqual({ 'ghost-1': { x: 7, y: -9 } })
  })
})
