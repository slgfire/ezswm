import type { Port } from '~~/types/port'
import type { LayoutBlock, LayoutUnit } from '~~/types/layoutTemplate'

/** Replicates a template's units once per stack member. Mirrors the server's
    port generation: member N's units are offset by (N - 1) * baseUnits.length. */
export function buildTemplateUnits(baseUnits: LayoutUnit[], stackSize = 1): LayoutUnit[] {
  if (stackSize <= 1 || baseUnits.length === 0) return baseUnits
  const incrementLabel = (label: string, memberIdx: number): string => {
    if (memberIdx === 1) return label
    const match = label.match(/^(.*?)(\d+)(.*)$/)
    if (match) return `${match[1]}${parseInt(match[2]!, 10) + memberIdx - 1}${match[3]}`
    return `${memberIdx}/${label}`
  }
  const stacked: LayoutUnit[] = []
  for (let member = 1; member <= stackSize; member++) {
    for (const unit of baseUnits) {
      stacked.push({
        ...unit,
        unit_number: unit.unit_number + (member - 1) * baseUnits.length,
        label: unit.label ? `Member ${member} - ${unit.label}` : `Member ${member}`,
        blocks: unit.blocks.map((b) => ({
          ...b,
          label: b.label ? incrementLabel(b.label, member) : b.label
        }))
      })
    }
  }
  return stacked
}

export function getBlockPorts(ports: Port[], unitNumber: number, block: LayoutBlock): Port[] {
  return ports
    .filter(p =>
      p.unit === unitNumber &&
      p.type === block.type &&
      p.index >= block.start_index &&
      p.index < block.start_index + block.count
    )
    .sort((a, b) => a.index - b.index)
}

/** Splits a block's ports into faceplate rows (sequential, odd-even, even-odd). */
export function getBlockRows(ports: Port[], unitNumber: number, block: LayoutBlock): Port[][] {
  const blockPorts = getBlockPorts(ports, unitNumber, block)
  if (blockPorts.length === 0) return []

  const rows = block.rows || 2
  const mode = block.row_layout || 'sequential'
  if (mode === 'odd-even') {
    // Relative position in block: first port = position 0
    return [blockPorts.filter((_, i) => i % 2 === 0), blockPorts.filter((_, i) => i % 2 === 1)]
  }
  if (mode === 'even-odd') {
    return [blockPorts.filter((_, i) => i % 2 === 1), blockPorts.filter((_, i) => i % 2 === 0)]
  }

  const perRow = Math.ceil(blockPorts.length / rows)
  const result: Port[][] = []
  for (let r = 0; r < rows; r++) {
    result.push(blockPorts.slice(r * perRow, (r + 1) * perRow))
  }
  return result
}

export interface PortStatusCounts { up: number, down: number, disabled: number }

export interface MiniatureUnit {
  unitNumber: number
  /** Template unit label; undefined → caller shows a localized "Unit n". */
  label?: string
  /** blocks → rows → ports */
  blocks: Port[][][]
}

export interface MiniatureMember {
  member: number
  units: MiniatureUnit[]
  counts: PortStatusCounts
}

function countStatuses(ports: Port[]): PortStatusCounts {
  const counts = { up: 0, down: 0, disabled: 0 }
  for (const p of ports) counts[p.status] = (counts[p.status] ?? 0) + 1
  return counts
}

/**
 * Groups a switch's real ports into stack members and units for the compact
 * overview preview, reusing the faceplate row logic of the detail grid.
 * Every real port appears exactly once: if the template does not cover the
 * stored ports exactly (no template, or a shared template edited after the
 * switch was created), all ports are shown per unit in index order as a
 * single group instead, because the member mapping is then unknown.
 * No ports → no members.
 */
export function buildPortMiniature(ports: Port[], baseUnits: LayoutUnit[] | null | undefined, stackSize = 1): MiniatureMember[] {
  if (ports.length === 0) return []
  if (!baseUnits?.length) return flatMiniature(ports)

  const members = Math.max(stackSize, 1)
  const allUnits = buildTemplateUnits(baseUnits, members)
  const result: MiniatureMember[] = []
  const seen = new Set<string>()
  let placed = 0
  for (let m = 0; m < members; m++) {
    const memberPorts: Port[] = []
    const units = allUnits.slice(m * baseUnits.length, (m + 1) * baseUnits.length).map((unit, i) => {
      const blocks = unit.blocks
        .map(block => getBlockRows(ports, unit.unit_number, block))
        .filter(rows => rows.length > 0)
      for (const rows of blocks) for (const row of rows) memberPorts.push(...row)
      return { unitNumber: unit.unit_number, label: baseUnits[i]!.label, blocks }
    })
    for (const p of memberPorts) seen.add(p.id)
    placed += memberPorts.length
    result.push({ member: m + 1, units, counts: countStatuses(memberPorts) })
  }
  if (placed !== ports.length || seen.size !== ports.length) return flatMiniature(ports)
  return result
}

function flatMiniature(ports: Port[]): MiniatureMember[] {
  const unitNumbers = [...new Set(ports.map(p => p.unit))].sort((a, b) => a - b)
  const units = unitNumbers.map(unitNumber => ({
    unitNumber,
    blocks: [[ports.filter(p => p.unit === unitNumber).sort((a, b) => a.index - b.index)]]
  }))
  return [{ member: 1, units, counts: countStatuses(ports) }]
}
