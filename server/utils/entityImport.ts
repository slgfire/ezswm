import { randomUUID } from 'node:crypto'

import { prisma } from '../db/client'
import { siteRepository } from '../repositories/siteRepository'
import { vlanRepository } from '../repositories/vlanRepository'
import { networkRepository } from '../repositories/networkRepository'
import { ipAllocationRepository } from '../repositories/ipAllocationRepository'
import { ipRangeRepository } from '../repositories/ipRangeRepository'
import { layoutTemplateRepository } from '../repositories/layoutTemplateRepository'
import { slugify, resolveSlugCollision } from './slugify'

export type EntityType = 'switches' | 'vlans' | 'networks' | 'allocations' | 'ranges' | 'templates'

const REQUIRED_FIELDS: Record<EntityType, string[]> = {
  switches: ['site_id', 'name'],
  vlans: ['site_id', 'vlan_id', 'name'],
  networks: ['site_id', 'name', 'subnet'],
  allocations: ['network_id', 'ip_address'],
  ranges: ['network_id', 'start_ip', 'end_ip'],
  templates: ['name']
}

export interface ImportError {
  row: number
  message: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: ImportError[]
}

function validateRow(type: EntityType, entry: Record<string, unknown>, index: number): string | null {
  for (const field of REQUIRED_FIELDS[type]) {
    const value = entry[field]
    if (value === null || value === undefined || value === '') {
      return `Row ${index + 1}: missing required field "${field}"`
    }
  }

  if (type === 'vlans') {
    const raw = entry.vlan_id
    const vid = typeof raw === 'string' ? parseInt(raw, 10) : (raw as number)
    if (!Number.isInteger(vid) || vid < 1 || vid > 4094) {
      return `Row ${index + 1}: vlan_id must be an integer between 1 and 4094`
    }
  }

  return null
}

function coerceDnsServers(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string') as string[]
  if (typeof value === 'string') return value.split(/[;,\s]+/).map(s => s.trim()).filter(Boolean)
  return []
}

async function importSwitches(rows: Record<string, unknown>[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const err = validateRow('switches', row, i)
    if (err) { result.errors.push({ row: i + 1, message: err }); continue }

    const site = await siteRepository.getById(String(row.site_id))
    if (!site) {
      result.errors.push({ row: i + 1, message: `site_id ${row.site_id} not found` })
      continue
    }
    const slug = await resolveSlugCollision(slugify(String(row.name)), async (candidate) => {
      const found = await prisma.switch.findUnique({
        where: { site_id_slug: { site_id: site.id, slug: candidate } }
      })
      return !!found
    })

    try {
      await prisma.switch.create({
        data: {
          id: randomUUID(),
          site_id: site.id,
          slug,
          name: String(row.name),
          model: row.model ? String(row.model) : null,
          manufacturer: row.manufacturer ? String(row.manufacturer) : null,
          serial_number: row.serial_number ? String(row.serial_number) : null,
          location: row.location ? String(row.location) : null,
          rack_position: row.rack_position ? String(row.rack_position) : null,
          management_ip: row.management_ip ? String(row.management_ip) : null,
          firmware_version: row.firmware_version ? String(row.firmware_version) : null,
          notes: row.notes ? String(row.notes) : null,
          tags: JSON.stringify(Array.isArray(row.tags) ? row.tags : []),
          configured_vlans: JSON.stringify([]),
          is_favorite: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
      result.imported++
    } catch (e: unknown) {
      result.errors.push({ row: i + 1, message: e instanceof Error ? e.message : String(e) })
    }
  }
  return result
}

async function importVlans(rows: Record<string, unknown>[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const err = validateRow('vlans', row, i)
    if (err) { result.errors.push({ row: i + 1, message: err }); continue }

    const site = await siteRepository.getById(String(row.site_id))
    if (!site) {
      result.errors.push({ row: i + 1, message: `site_id ${row.site_id} not found` })
      continue
    }
    const tag = typeof row.vlan_id === 'string' ? parseInt(row.vlan_id, 10) : Number(row.vlan_id)
    try {
      const color = String(row.color ?? (await vlanRepository.getNextAvailableColor(site.id)) ?? '#3B82F6')
      await vlanRepository.create({
        site_id: site.id,
        vlan_id: tag,
        name: String(row.name),
        description: row.description ? String(row.description) : undefined,
        status: (row.status as 'active' | 'inactive') ?? 'active',
        routing_device: row.routing_device ? String(row.routing_device) : undefined,
        color
      })
      result.imported++
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if ((e as { statusCode?: number })?.statusCode === 409) {
        result.skipped++
        result.errors.push({ row: i + 1, message: `Skipped: ${msg}` })
      } else {
        result.errors.push({ row: i + 1, message: msg })
      }
    }
  }
  return result
}

async function importNetworks(rows: Record<string, unknown>[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const err = validateRow('networks', row, i)
    if (err) { result.errors.push({ row: i + 1, message: err }); continue }

    const site = await siteRepository.getById(String(row.site_id))
    if (!site) {
      result.errors.push({ row: i + 1, message: `site_id ${row.site_id} not found` })
      continue
    }
    let vlanRef: string | undefined
    if (row.vlan_id !== undefined && row.vlan_id !== null && row.vlan_id !== '') {
      const found = await vlanRepository.getById(String(row.vlan_id))
      if (!found) {
        result.errors.push({ row: i + 1, message: `vlan_id ${row.vlan_id} not found` })
        continue
      }
      vlanRef = found.id
    }
    try {
      await networkRepository.create({
        site_id: site.id,
        name: String(row.name),
        subnet: String(row.subnet),
        gateway: row.gateway ? String(row.gateway) : undefined,
        vlan_id: vlanRef,
        dns_servers: coerceDnsServers(row.dns_servers),
        description: row.description ? String(row.description) : undefined
      })
      result.imported++
    } catch (e: unknown) {
      result.errors.push({ row: i + 1, message: e instanceof Error ? e.message : String(e) })
    }
  }
  return result
}

async function importAllocations(rows: Record<string, unknown>[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const err = validateRow('allocations', row, i)
    if (err) { result.errors.push({ row: i + 1, message: err }); continue }

    try {
      await ipAllocationRepository.create(String(row.network_id), {
        ip_address: String(row.ip_address),
        hostname: row.hostname ? String(row.hostname) : undefined,
        mac_address: row.mac_address ? String(row.mac_address) : undefined,
        device_type: row.device_type as 'server' | 'switch' | 'router' | 'firewall' | 'printer' | 'phone' | 'ap' | 'camera' | 'other' | undefined,
        description: row.description ? String(row.description) : undefined,
        status: (row.status as 'active' | 'reserved' | 'inactive') ?? 'active'
      })
      result.imported++
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if ((e as { statusCode?: number })?.statusCode === 409) result.skipped++
      result.errors.push({ row: i + 1, message: msg })
    }
  }
  return result
}

async function importRanges(rows: Record<string, unknown>[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const err = validateRow('ranges', row, i)
    if (err) { result.errors.push({ row: i + 1, message: err }); continue }
    try {
      await ipRangeRepository.create(String(row.network_id), {
        start_ip: String(row.start_ip),
        end_ip: String(row.end_ip),
        type: (row.type as 'static' | 'dhcp' | 'reserved') ?? 'dhcp',
        description: row.description ? String(row.description) : undefined
      })
      result.imported++
    } catch (e: unknown) {
      result.errors.push({ row: i + 1, message: e instanceof Error ? e.message : String(e) })
    }
  }
  return result
}

async function importTemplates(rows: Record<string, unknown>[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const err = validateRow('templates', row, i)
    if (err) { result.errors.push({ row: i + 1, message: err }); continue }
    try {
      await layoutTemplateRepository.create({
        name: String(row.name),
        manufacturer: row.manufacturer ? String(row.manufacturer) : undefined,
        model: row.model ? String(row.model) : undefined,
        description: row.description ? String(row.description) : undefined,
        units: (Array.isArray(row.units) ? row.units : []) as []
      })
      result.imported++
    } catch (e: unknown) {
      result.errors.push({ row: i + 1, message: e instanceof Error ? e.message : String(e) })
    }
  }
  return result
}

export const IMPORTERS: Record<EntityType, (rows: Record<string, unknown>[]) => Promise<ImportResult>> = {
  switches: importSwitches,
  vlans: importVlans,
  networks: importNetworks,
  allocations: importAllocations,
  ranges: importRanges,
  templates: importTemplates
}

export function isEntityType(s: string | undefined): s is EntityType {
  return !!s && s in IMPORTERS
}
