import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../../storage/jsonStorage'
import type { Switch } from '../../../types/switch'
import type { VLAN } from '../../../types/vlan'
import type { Network } from '../../../types/network'
import type { IPAllocation } from '../../../types/ipAllocation'
import type { LayoutTemplate } from '../../../types/layoutTemplate'
import type { IPRange } from '../../../types/ipRange'

type EntityType = 'switches' | 'vlans' | 'networks' | 'allocations' | 'ranges' | 'templates'

const ENTITY_FILE_MAP: Record<EntityType, string> = {
  switches: 'switches.json',
  vlans: 'vlans.json',
  networks: 'networks.json',
  allocations: 'ipAllocations.json',
  ranges: 'ipRanges.json',
  templates: 'layoutTemplates.json'
}

const REQUIRED_FIELDS: Record<EntityType, string[]> = {
  switches: ['name'],
  vlans: ['vlan_id', 'name'],
  networks: ['name', 'subnet'],
  allocations: ['network_id', 'ip_address'],
  ranges: ['network_id', 'start_ip', 'end_ip'],
  templates: ['name']
}

function sameSite(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  if (!a.site_id || !b.site_id) return true
  return a.site_id === b.site_id
}

function getDuplicateReason(type: EntityType, entry: Record<string, unknown>, existing: Record<string, unknown>[]): string | null {
  switch (type) {
    case 'switches':
      if (existing.some(e => sameSite(e, entry) && e.name === entry.name)) return `name "${entry.name}"`
      return null
    case 'vlans':
      if (existing.some(e => sameSite(e, entry) && e.vlan_id === entry.vlan_id)) return `vlan_id ${entry.vlan_id}`
      if (existing.some(e => sameSite(e, entry) && e.name === entry.name)) return `name "${entry.name}"`
      return null
    case 'networks':
      if (existing.some(e => sameSite(e, entry) && e.subnet === entry.subnet)) return `subnet ${entry.subnet}`
      return null
    case 'allocations':
      if (existing.some(e => e.ip_address === entry.ip_address && e.network_id === entry.network_id)) return `ip_address ${entry.ip_address}`
      return null
    case 'ranges':
      if (existing.some(e => e.network_id === entry.network_id && e.start_ip === entry.start_ip && e.end_ip === entry.end_ip)) return `range ${entry.start_ip}-${entry.end_ip}`
      return null
    case 'templates':
      if (existing.some(e => e.name === entry.name)) return `name "${entry.name}"`
      return null
    default:
      return null
  }
}

function prepareEntry(type: EntityType, entry: Record<string, unknown>): Record<string, unknown> {
  const now = new Date().toISOString()
  const base: Record<string, unknown> = {
    ...entry,
    id: nanoid(),
    created_at: now,
    updated_at: now
  }

  switch (type) {
    case 'switches':
      base.ports = base.ports || []
      base.is_favorite = false
      break
    case 'vlans':
      base.status = base.status || 'active'
      base.is_favorite = false
      if (!base.color) base.color = '#3498DB'
      // Ensure vlan_id is a number
      if (typeof base.vlan_id === 'string') base.vlan_id = parseInt(base.vlan_id as string, 10)
      break
    case 'networks':
      base.dns_servers = base.dns_servers || []
      base.is_favorite = false
      // Handle dns_servers as semicolon-separated string from CSV
      if (typeof base.dns_servers === 'string') {
        base.dns_servers = (base.dns_servers as string).split(';').map(s => s.trim()).filter(Boolean)
      }
      break
    case 'allocations':
      base.status = base.status || 'active'
      break
    case 'ranges':
      base.type = base.type || 'dhcp'
      break
    case 'templates':
      base.units = base.units || []
      break
  }

  return base
}

function validateEntry(type: EntityType, entry: Record<string, unknown>, index: number): string | null {
  const required = REQUIRED_FIELDS[type]
  for (const field of required) {
    if (!entry[field] && entry[field] !== 0) {
      return `Row ${index + 1}: missing required field "${field}"`
    }
  }

  if (type === 'vlans') {
    const vid = typeof entry.vlan_id === 'string' ? parseInt(entry.vlan_id as string, 10) : entry.vlan_id as number
    if (isNaN(vid) || vid < 1 || vid > 4094) {
      return `Row ${index + 1}: vlan_id must be between 1 and 4094`
    }
  }

  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || !body.type || !Array.isArray(body.data)) {
    throw createError({ statusCode: 400, message: 'Request body must include "type" and "data" array' })
  }

  const type = body.type as EntityType
  if (!ENTITY_FILE_MAP[type]) {
    throw createError({ statusCode: 400, message: 'Invalid entity type. Must be one of: switches, vlans, networks, allocations, ranges, templates' })
  }

  const existing = readJson<Record<string, unknown>[]>(ENTITY_FILE_MAP[type])
  const errors: string[] = []
  const skippedDetails: string[] = []
  let imported = 0

  for (let i = 0; i < body.data.length; i++) {
    const entry = body.data[i]

    // Validate
    const validationError = validateEntry(type, entry, i)
    if (validationError) {
      errors.push(validationError)
      continue
    }

    // Check duplicates
    const dupReason = getDuplicateReason(type, entry, existing)
    if (dupReason) {
      skippedDetails.push(`Row ${i + 1}: duplicate ${dupReason}`)
      continue
    }

    // Prepare and add
    const prepared = prepareEntry(type, entry)
    existing.push(prepared)
    imported++
  }

  // Write back
  if (imported > 0) {
    writeJson(ENTITY_FILE_MAP[type], existing)
  }

  return { imported, skipped: skippedDetails.length, skippedDetails, errors }
})
