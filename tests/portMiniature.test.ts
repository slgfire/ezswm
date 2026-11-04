import { describe, expect, it } from 'vitest'
import type { Port } from '../types/port'
import type { LayoutUnit } from '../types/layoutTemplate'
import { buildPortMiniature, buildTemplateUnits, getBlockRows, splitStackPreview } from '../app/utils/portMiniature'

function port(unit: number, index: number, status: Port['status'] = 'down', type: Port['type'] = 'rj45'): Port {
  return { id: `${unit}-${type}-${index}`, unit, index, type, status, label: `${unit}/${index}`, tagged_vlans: [] } as Port
}

function portsFor(units: LayoutUnit[], stackSize = 1): Port[] {
  return buildTemplateUnits(units, stackSize).flatMap(u =>
    u.blocks.flatMap(b => Array.from({ length: b.count }, (_, i) => port(u.unit_number, b.start_index + i, 'down', b.type)))
  )
}

const single: LayoutUnit[] = [{
  unit_number: 1,
  label: 'Front',
  blocks: [
    { id: 'a', type: 'rj45', count: 8, start_index: 1, rows: 2, row_layout: 'odd-even', label: 'Gi1/0/1' },
    { id: 'b', type: 'sfp', count: 2, start_index: 9, rows: 1 }
  ]
}]

const chassis: LayoutUnit[] = [
  { unit_number: 1, label: 'Slot A', blocks: [{ id: 'a', type: 'rj45', count: 4, start_index: 1, rows: 1 }] },
  { unit_number: 2, label: 'Slot B', blocks: [{ id: 'b', type: 'rj45', count: 4, start_index: 1, rows: 1 }] }
]

describe('buildTemplateUnits', () => {
  it('returns base units unchanged for a single switch and replicates stacks without mutating', () => {
    expect(buildTemplateUnits(single, 1)).toBe(single)
    const stacked = buildTemplateUnits(single, 3)
    expect(stacked.map(u => u.unit_number)).toEqual([1, 2, 3])
    expect(stacked[2]!.label).toBe('Member 3 - Front')
    expect(stacked[1]!.blocks[0]!.label).toBe('Gi2/0/1')
    expect(single[0]!.label).toBe('Front')
    expect(single[0]!.blocks[0]!.label).toBe('Gi1/0/1')
  })
})

describe('getBlockRows', () => {
  it('keeps odd-even faceplate order', () => {
    const rows = getBlockRows(portsFor(single), 1, single[0]!.blocks[0]!)
    expect(rows.map(r => r.map(p => p.index))).toEqual([[1, 3, 5, 7], [2, 4, 6, 8]])
  })

  it('keeps even-odd and sequential faceplate order', () => {
    const ports = portsFor(single)
    const block = single[0]!.blocks[0]!
    expect(getBlockRows(ports, 1, { ...block, row_layout: 'even-odd' }).map(r => r.map(p => p.index)))
      .toEqual([[2, 4, 6, 8], [1, 3, 5, 7]])
    expect(getBlockRows(ports, 1, { ...block, row_layout: 'sequential' }).map(r => r.map(p => p.index)))
      .toEqual([[1, 2, 3, 4], [5, 6, 7, 8]])
    expect(getBlockRows(ports, 1, { ...block, row_layout: undefined, rows: undefined } as never).map(r => r.length)).toEqual([4, 4])
  })
})

describe('buildPortMiniature', () => {
  it('returns nothing for a switch without ports', () => {
    expect(buildPortMiniature([], single, 1)).toEqual([])
  })

  it('maps a single switch to one member with real port status', () => {
    const ports = portsFor(single)
    ports.find(p => p.index === 3)!.status = 'up'
    ports.find(p => p.index === 9)!.status = 'disabled'
    const before = JSON.stringify(ports)
    const members = buildPortMiniature(ports, single, 1)
    expect(members).toHaveLength(1)
    expect(members[0]!.counts).toEqual({ up: 1, down: 8, disabled: 1 })
    const [rj45, sfp] = members[0]!.units[0]!.blocks
    expect(rj45![0]!.map(p => p.status)).toEqual(['down', 'up', 'down', 'down'])
    expect(sfp![0]!.map(p => p.id)).toEqual(['1-sfp-9', '1-sfp-10'])
    expect(JSON.stringify(ports)).toBe(before)
  })

  it.each([2, 4])('splits a %i-member stack by member with restarting port indexes', (stackSize) => {
    const ports = portsFor(single, stackSize)
    ports.find(p => p.unit === stackSize && p.index === 1)!.status = 'up'
    const members = buildPortMiniature(ports, single, stackSize)
    expect(members.map(m => m.member)).toEqual(Array.from({ length: stackSize }, (_, i) => i + 1))
    for (const m of members) {
      const memberPorts = m.units.flatMap(u => u.blocks.flat(2))
      expect(memberPorts).toHaveLength(10)
      expect(new Set(memberPorts.map(p => p.unit))).toEqual(new Set([m.member]))
      expect(Math.min(...memberPorts.map(p => p.index))).toBe(1)
      expect(m.units[0]!.label).toBe('Front')
    }
    expect(members[stackSize - 1]!.counts.up).toBe(1)
    expect(members[0]!.counts.up).toBe(0)
  })

  it('keeps chassis units together in one member and stacks whole chassis', () => {
    const one = buildPortMiniature(portsFor(chassis), chassis, 1)
    expect(one).toHaveLength(1)
    expect(one[0]!.units.map(u => [u.unitNumber, u.label])).toEqual([[1, 'Slot A'], [2, 'Slot B']])
    const two = buildPortMiniature(portsFor(chassis, 2), chassis, 2)
    expect(two.map(m => m.units.map(u => u.unitNumber))).toEqual([[1, 2], [3, 4]])
  })

  it('shows every real port once when a shared template was edited after creation', () => {
    const ports = portsFor(single, 2)
    ports.push(port(1, 11, 'up'), port(2, 11, 'disabled'))
    const members = buildPortMiniature(ports, single, 2)
    expect(members).toHaveLength(1)
    const shown = members[0]!.units.flatMap(u => u.blocks.flat(2))
    expect(shown).toHaveLength(ports.length)
    expect(new Set(shown.map(p => p.id)).size).toBe(ports.length)
    expect(members[0]!.counts).toEqual({ up: 1, down: 20, disabled: 1 })
    expect(members[0]!.units.map(u => [u.unitNumber, u.label])).toEqual([[1, undefined], [2, undefined]])
  })

  it('does not invent member mapping for a stack without a template', () => {
    const members = buildPortMiniature(portsFor(single, 2), null, 2)
    expect(members).toHaveLength(1)
    expect(members[0]!.units.map(u => u.unitNumber)).toEqual([1, 2])
  })

  it('falls back to real ports per unit without a template or when the template no longer matches', () => {
    const ports = [port(2, 2, 'up'), port(1, 2), port(1, 1, 'disabled')]
    for (const units of [null, chassis.map(u => ({ ...u, blocks: u.blocks.map(b => ({ ...b, type: 'qsfp' as const })) }))]) {
      const [m] = buildPortMiniature(ports, units, 1)
      expect(m!.units.map(u => u.unitNumber)).toEqual([1, 2])
      expect(m!.units[0]!.blocks[0]![0]!.map(p => p.index)).toEqual([1, 2])
      expect(m!.counts).toEqual({ up: 1, down: 1, disabled: 1 })
    }
  })
})

describe('splitStackPreview', () => {
  const ids = (list: { member: number }[]) => list.map(m => m.member)

  it('shows a single switch unchanged', () => {
    const members = buildPortMiniature(portsFor(single), single, 1)
    expect(splitStackPreview(members, 1, false)).toEqual({ shown: members, hidden: [], expandable: false })
  })

  it.each([[2, [1, 2], [], false], [3, [1, 2], [3], true], [4, [1, 2], [3, 4], true]])('previews at most two members of a %i-member stack and names the rest', (stackSize, shown, hidden, expandable) => {
    const ports = portsFor(single, stackSize)
    ports.find(p => p.unit === stackSize && p.index === 1)!.status = 'up'
    const members = buildPortMiniature(ports, single, stackSize)
    const collapsed = splitStackPreview(members, stackSize, false)
    expect(ids(collapsed.shown)).toEqual(shown)
    expect(ids(collapsed.hidden)).toEqual(hidden)
    // A disclosure only when the collapsed card leaves members out.
    expect(collapsed.expandable).toBe(expandable)
    // Shown + named members always cover the whole stack, so card totals stay whole-stack.
    const counted = [...collapsed.shown, ...collapsed.hidden].reduce((sum, m) => sum + m.counts.up + m.counts.down + m.counts.disabled, 0)
    expect(counted).toBe(ports.length)
    expect([...collapsed.shown, ...collapsed.hidden].reduce((sum, m) => sum + m.counts.up, 0)).toBe(1)

    const open = splitStackPreview(members, stackSize, true)
    expect(ids(open.shown)).toEqual(Array.from({ length: stackSize }, (_, i) => i + 1))
    expect(open.hidden).toEqual([])
  })

  it.each([2, 3])('keeps an unmapped %i-member stack collapsed with a disclosure until expanded', (stackSize) => {
    const members = buildPortMiniature(portsFor(single, stackSize), null, stackSize)
    expect(splitStackPreview(members, stackSize, false)).toEqual({ shown: [], hidden: [], expandable: true })
    expect(splitStackPreview(members, stackSize, true).shown).toBe(members)
  })
})
