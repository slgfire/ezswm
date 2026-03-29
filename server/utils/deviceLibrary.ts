import type {
  LayoutBlock,
  LayoutUnit,
  LayoutTemplate,
  PoeConfig,
  AirflowDirection
} from '../../types/layoutTemplate'

import type { PortType, PortSpeed } from '../../types/port'

// ---------------------------------------------------------------------------
// Internal types for NetBox YAML structures
// ---------------------------------------------------------------------------

export interface NetboxInterface {
  name: string
  type: string
  mgmt_only?: boolean
  poe_mode?: string
  poe_type?: string
}

export interface NetboxConsolePort {
  name: string
  type?: string
}

export interface NetboxDevice {
  manufacturer: string
  model: string
  interfaces?: NetboxInterface[]
  'console-ports'?: NetboxConsolePort[]
  comments?: string
  airflow?: string
}

// ---------------------------------------------------------------------------
// Mapped type result
// ---------------------------------------------------------------------------

export interface MappedType {
  type: PortType
  speed: PortSpeed
  physical_type?: 'rj45' | 'sfp'
}

// ---------------------------------------------------------------------------
// Stacking/virtual type set — these should be skipped
// ---------------------------------------------------------------------------

const SKIP_TYPES = new Set([
  'cisco-stackwise',
  'cisco-stackwise-plus',
  'cisco-stackwise-480',
  'cisco-stackwise-1t',
  'cisco-flexstack',
  'cisco-flexstack-plus',
  'juniper-vcp',
  'extreme-summitstack',
  'extreme-summitstack-128',
  'extreme-summitstack-256',
  'extreme-summitstack-512',
  'virtual',
  'bridge',
  'lag'
])

// ---------------------------------------------------------------------------
// mapNetboxType
// ---------------------------------------------------------------------------

/**
 * Maps a NetBox interface object to an ezSWM port type + speed.
 * Returns null for stacking/virtual types that should be skipped.
 */
export function mapNetboxType(iface: { type: string; mgmt_only?: boolean }): MappedType | null {
  const value = iface.type

  // Skip stacking and virtual types
  if (SKIP_TYPES.has(value)) {
    return null
  }

  // Determine base type and speed from the NetBox type string
  let type: PortType
  let speed: PortSpeed
  let physical_type: 'rj45' | 'sfp' | undefined

  if (value === '100base-tx') {
    type = 'rj45'
    speed = '100M'
  } else if (value === '1000base-t' || value === '1000base-tx') {
    type = 'rj45'
    speed = '1G'
  } else if (value === '2.5gbase-t') {
    type = 'rj45'
    speed = '2.5G'
  } else if (value === '5gbase-t') {
    type = 'rj45'
    speed = '10G'
  } else if (value === '10gbase-t') {
    type = 'rj45'
    speed = '10G'
  } else if (value === '1000base-x-sfp') {
    type = 'sfp'
    speed = '1G'
  } else if (value === '10gbase-x-sfpp') {
    type = 'sfp+'
    speed = '10G'
  } else if (value === '25gbase-x-sfp28') {
    type = 'sfp+'
    speed = '10G'
  } else if (
    value === '40gbase-x-qsfpp' ||
    value === '100gbase-x-qsfp28' ||
    value === '100gbase-x-qsfpdd' ||
    value === '200gbase-x-qsfp56' ||
    value === '400gbase-x-qsfpdd'
  ) {
    type = 'qsfp'
    speed = '100G'
  } else {
    // Fallback for unrecognized types
    type = 'rj45'
    speed = '1G'
  }

  // Override with management if mgmt_only
  if (iface.mgmt_only) {
    // Determine physical_type based on the underlying type
    if (type === 'sfp' || type === 'sfp+' || type === 'qsfp') {
      physical_type = 'sfp'
    } else {
      physical_type = 'rj45'
    }
    return { type: 'management', speed: '1G', physical_type }
  }

  return { type, speed }
}

// ---------------------------------------------------------------------------
// mapNetboxPoe
// ---------------------------------------------------------------------------

/**
 * Maps a NetBox PoE type string to an ezSWM PoeConfig.
 * Returns undefined for unknown or missing values.
 */
export function mapNetboxPoe(poeType: string | undefined): PoeConfig | undefined {
  if (!poeType) return undefined

  if (poeType === 'type1-ieee802.3af') {
    return { type: '802.3af', max_watts: 15.4 }
  }
  if (poeType === 'type2-ieee802.3at') {
    return { type: '802.3at', max_watts: 30 }
  }
  if (poeType === 'type3-ieee802.3bt') {
    return { type: '802.3bt-type3', max_watts: 60 }
  }
  if (poeType === 'type4-ieee802.3bt') {
    return { type: '802.3bt-type4', max_watts: 100 }
  }
  if (poeType.startsWith('passive-24v')) {
    return { type: 'passive-24v', max_watts: 24 }
  }
  if (poeType.startsWith('passive-48v')) {
    return { type: 'passive-48v', max_watts: 48 }
  }

  return undefined
}

// ---------------------------------------------------------------------------
// incrementMemberLabel
// ---------------------------------------------------------------------------

/**
 * Increments the first digit sequence in a label for stacking member offsets.
 *
 * - member 1: return label unchanged
 * - First digit found: replace with (originalNumber + memberIndex - 1)
 * - No digit found: prepend "{memberIndex}/" to label
 */
export function incrementMemberLabel(label: string, memberIndex: number): string {
  if (memberIndex === 1) return label

  const match = label.match(/\d+/)
  if (!match || match.index === undefined) {
    return `${memberIndex}/${label}`
  }

  const original = parseInt(match[0], 10)
  const incremented = original + memberIndex - 1
  return label.slice(0, match.index) + String(incremented) + label.slice(match.index + match[0].length)
}

// ---------------------------------------------------------------------------
// Natural sort for interface names
// ---------------------------------------------------------------------------

function naturalSortKey(name: string): Array<number | string> {
  return name.split(/(\d+)/).map((part, i) =>
    i % 2 === 1 ? parseInt(part, 10) : part
  )
}

function compareNatural(a: string, b: string): number {
  const aKey = naturalSortKey(a)
  const bKey = naturalSortKey(b)
  for (let i = 0; i < Math.max(aKey.length, bKey.length); i++) {
    const aVal = aKey[i] ?? ''
    const bVal = bKey[i] ?? ''
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      if (aVal !== bVal) return aVal - bVal
    } else {
      const aStr = String(aVal)
      const bStr = String(bVal)
      if (aStr < bStr) return -1
      if (aStr > bStr) return 1
    }
  }
  return 0
}

// ---------------------------------------------------------------------------
// Extract name prefix (everything before the last number)
// ---------------------------------------------------------------------------

function getNamePrefix(name: string): string {
  const match = name.match(/^(.*?)(\d+)([^0-9]*)$/)
  if (!match) return name

  // prefix is everything up to and including all parts before the last number
  // We want "everything before the trailing number sequence"
  // e.g. "GigabitEthernet0/1" → last digits are "1", trailing = "" → prefix = "GigabitEthernet0/"
  // e.g. "Ethernet1" → last digits are "1", trailing = "" → prefix = "Ethernet"
  return match[1] + (match[3] ? match[3] : '')
}

// More robust: find the "group key" which is type + prefix
function getGroupKey(iface: NetboxInterface, mapped: MappedType): string {
  const prefix = getNamePrefixForGrouping(iface.name)
  return `${mapped.type}::${prefix}`
}

/**
 * Returns the prefix used for grouping — everything before the trailing number.
 * Example: "GigabitEthernet0/12" → "GigabitEthernet0/"
 * Example: "Ethernet1" → "Ethernet"
 */
function getNamePrefixForGrouping(name: string): string {
  // Match everything up to the last sequence of digits at the end (optionally followed by non-digit suffix)
  // We split on the LAST number in the name
  const match = name.match(/^(.*\D)(\d+)(\D*)$/)
  if (match) {
    // prefix = everything before last number + trailing non-digits
    return match[1] + match[3]
  }
  // Name starts with digits
  const matchDigitStart = name.match(/^(\d+)(\D.*)$|^(\d+)$/)
  if (matchDigitStart) {
    return ''
  }
  return name
}

/**
 * Extract the trailing number from a name, used as start_index.
 */
function getTrailingNumber(name: string): number {
  const match = name.match(/(\d+)(\D*)$/)
  if (match) return parseInt(match[1], 10)
  return 1
}

// ---------------------------------------------------------------------------
// Simple ID generator (without nanoid dependency in tests)
// ---------------------------------------------------------------------------

let blockIdCounter = 0

function generateBlockId(): string {
  blockIdCounter++
  return `block-${Date.now()}-${blockIdCounter}`
}

// ---------------------------------------------------------------------------
// groupInterfacesToBlocks
// ---------------------------------------------------------------------------

/**
 * Groups NetBox interfaces into ezSWM LayoutBlocks.
 *
 * - Filters stacking/virtual interfaces
 * - Sorts by name (natural sort)
 * - Groups consecutive interfaces by mapped type + name prefix
 * - Creates console block from console-ports array
 * - Creates management block for mgmt_only interfaces
 */
export function groupInterfacesToBlocks(
  interfaces: unknown[],
  consolePorts: unknown[]
): LayoutBlock[] {
  const blocks: LayoutBlock[] = []

  // Cast to typed
  const typedInterfaces = interfaces as NetboxInterface[]
  const typedConsolePorts = consolePorts as NetboxConsolePort[]

  // Filter and map
  type MappedIface = { iface: NetboxInterface; mapped: MappedType }
  const mapped: MappedIface[] = []

  for (const iface of typedInterfaces) {
    const result = mapNetboxType(iface)
    if (result === null) continue
    mapped.push({ iface, mapped: result })
  }

  // Deduplicate combo ports: ge-0/0/X and xe-0/0/X are the same physical port.
  // Keep the higher-speed variant (sfp+ over sfp, sfp over rj45).
  const SPEED_RANK: Record<string, number> = { '100M': 1, '1G': 2, '2.5G': 3, '10G': 4, '100G': 5 }
  const portByNumber = new Map<string, MappedIface>()
  for (const item of mapped) {
    const trailingNum = getTrailingNumber(item.iface.name)
    const prefix = getNamePrefixForGrouping(item.iface.name)
    // Use trailing number as dedup key (only for non-management, same slot pattern)
    // e.g. ge-0/0/5 and xe-0/0/5 share trailing number 5 with similar prefix pattern
    const slotParts = item.iface.name.match(/^[a-z]+-(\d+\/\d+\/)(\d+)$/)
    if (slotParts && !item.iface.mgmt_only) {
      const slotKey = `${slotParts[1]}${slotParts[2]}`
      const existing = portByNumber.get(slotKey)
      if (existing) {
        const existingRank = SPEED_RANK[existing.mapped.speed] || 0
        const newRank = SPEED_RANK[item.mapped.speed] || 0
        if (newRank > existingRank) {
          portByNumber.set(slotKey, item)
        }
        // Skip — already have this physical port
        continue
      }
      portByNumber.set(slotKey, item)
    }
  }

  // Rebuild mapped list with deduplication applied
  const deduped: MappedIface[] = []
  const seen = new Set<string>()
  for (const item of mapped) {
    const slotParts = item.iface.name.match(/^[a-z]+-(\d+\/\d+\/)(\d+)$/)
    if (slotParts && !item.iface.mgmt_only) {
      const slotKey = `${slotParts[1]}${slotParts[2]}`
      const winner = portByNumber.get(slotKey)
      if (winner && winner.iface.name === item.iface.name && !seen.has(slotKey)) {
        deduped.push(item)
        seen.add(slotKey)
      }
    } else {
      deduped.push(item)
    }
  }

  // Sort by natural name (keeps same-prefix ports grouped together)
  deduped.sort((a, b) => compareNatural(a.iface.name, b.iface.name))

  // Separate management from regular interfaces
  const mgmtInterfaces = deduped.filter(m => m.mapped.type === 'management')
  const regularInterfaces = deduped.filter(m => m.mapped.type !== 'management')

  // Group regular interfaces by consecutive same-group key
  // Group key = type + name prefix
  type Group = {
    type: PortType
    speed: PortSpeed
    prefix: string
    members: MappedIface[]
    poe?: PoeConfig
  }

  const groups: Group[] = []

  for (const item of regularInterfaces) {
    const prefix = getNamePrefixForGrouping(item.iface.name)
    const key = `${item.mapped.type}::${prefix}`

    const last = groups[groups.length - 1]
    const lastKey = last ? `${last.type}::${last.prefix}` : null

    if (last && lastKey === key) {
      last.members.push(item)
    } else {
      // Determine PoE from first interface in this group
      const poe = item.iface.poe_type
        ? mapNetboxPoe(item.iface.poe_type)
        : undefined

      groups.push({
        type: item.mapped.type,
        speed: item.mapped.speed,
        prefix,
        members: [item],
        poe
      })
    }
  }

  // Sort groups by their first port's trailing number
  // This ensures QSFP (et-0/0/48) comes after SFP+ (xe-0/0/0) regardless of alphabetical order
  groups.sort((a, b) => {
    const aStart = getTrailingNumber(a.members[0].iface.name)
    const bStart = getTrailingNumber(b.members[0].iface.name)
    return aStart - bStart
  })

  // Convert groups to blocks
  for (const group of groups) {
    const count = group.members.length
    const firstInterface = group.members[0].iface
    const startIndex = getTrailingNumber(firstInterface.name)

    // Determine row layout based on port count and type
    // QSFP/SFP+ ports use 2 rows at lower counts since they're physically wider
    const useDoubleRow = count >= 24
      || (group.type === 'qsfp' && count >= 4)
      || (group.type === 'sfp+' && count >= 8)
      || (group.type === 'sfp' && count >= 8)
    const rows = useDoubleRow ? 2 : 1
    const rowLayout = useDoubleRow ? 'odd-even' as const : 'sequential' as const

    const block: LayoutBlock = {
      id: generateBlockId(),
      type: group.type,
      count,
      start_index: startIndex,
      rows,
      ...(rowLayout ? { row_layout: rowLayout } : {}),
      default_speed: group.speed,
      ...(group.prefix ? { label: group.prefix } : {}),
      ...(group.poe ? { poe: group.poe } : {})
    }

    blocks.push(block)
  }

  // Management interfaces block
  if (mgmtInterfaces.length > 0) {
    const firstMgmt = mgmtInterfaces[0]
    const startIndex = getTrailingNumber(firstMgmt.iface.name)
    const prefix = getNamePrefixForGrouping(firstMgmt.iface.name)

    const block: LayoutBlock = {
      id: generateBlockId(),
      type: 'management',
      count: mgmtInterfaces.length,
      start_index: startIndex,
      rows: 1,
      default_speed: '1G',
      ...(prefix ? { label: prefix } : {}),
      physical_type: firstMgmt.mapped.physical_type
    }

    blocks.push(block)
  }

  // Console ports block
  if (typedConsolePorts.length > 0) {
    const block: LayoutBlock = {
      id: generateBlockId(),
      type: 'console',
      count: typedConsolePorts.length,
      start_index: 1,
      rows: 1,
      label: 'Console'
    }

    blocks.push(block)
  }

  return blocks
}

// ---------------------------------------------------------------------------
// convertNetboxToTemplate
// ---------------------------------------------------------------------------

const VALID_AIRFLOW_VALUES: AirflowDirection[] = [
  'front-to-rear',
  'rear-to-front',
  'left-to-right',
  'right-to-left',
  'passive',
  'mixed'
]

/**
 * Converts a parsed NetBox device YAML object to a partial ezSWM layout template.
 */
export function convertNetboxToTemplate(
  device: NetboxDevice
): Omit<LayoutTemplate, 'id' | 'created_at' | 'updated_at'> {
  const name = `${device.manufacturer} ${device.model}`

  // Extract first URL from comments (strip trailing ) from markdown links)
  let datasheet_url: string | undefined
  if (device.comments) {
    const urlMatch = device.comments.match(/https?:\/\/[^\s)]+/)
    if (urlMatch) {
      datasheet_url = urlMatch[0]
    }
  }

  // Validate airflow
  let airflow: AirflowDirection | undefined
  if (device.airflow && VALID_AIRFLOW_VALUES.includes(device.airflow as AirflowDirection)) {
    airflow = device.airflow as AirflowDirection
  }

  // Build blocks — NetBox YAML uses 'console-ports' with hyphen
  const blocks = groupInterfacesToBlocks(
    device.interfaces ?? [],
    device['console-ports'] ?? []
  )

  const unit: LayoutUnit = {
    unit_number: 1,
    blocks
  }

  return {
    name,
    manufacturer: device.manufacturer,
    model: device.model,
    ...(datasheet_url ? { datasheet_url } : {}),
    ...(airflow ? { airflow } : {}),
    units: [unit]
  }
}
