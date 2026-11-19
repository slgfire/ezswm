import type { PrismaClient } from '@prisma/client'
import { exportRows, jsonExportArray, sendSnapshotExport } from '../../utils/snapshotExport'
import { getAuthContext } from '../../utils/requireAdmin'

type EntityType = 'switches' | 'vlans' | 'networks' | 'allocations' | 'templates'
type ExportFormat = 'json' | 'csv'

const CSV_HEADERS: Record<EntityType, string[]> = {
  switches: ['id', 'site_id', 'name', 'model', 'manufacturer', 'serial_number', 'location', 'rack_position', 'management_ip', 'management_protocol', 'management_url', 'firmware_version', 'layout_template_id', 'notes', 'created_at', 'updated_at'],
  vlans: ['id', 'site_id', 'vlan_id', 'name', 'description', 'status', 'routing_device', 'color', 'created_at', 'updated_at'],
  networks: ['id', 'site_id', 'name', 'vlan_id', 'subnet', 'gateway', 'dns_servers', 'description', 'created_at', 'updated_at'],
  allocations: ['id', 'network_id', 'ip_address', 'hostname', 'mac_address', 'device_type', 'description', 'status', 'created_at', 'updated_at'],
  templates: ['id', 'name', 'manufacturer', 'model', 'description', 'created_at', 'updated_at']
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = Array.isArray(value) ? value.join(';') : String(value)
  // Text prepended with an apostrophe is treated as literal data by spreadsheets.
  const formulaLike = typeof value !== 'number' && (/^[\t\r\n]/u.test(text) || /^\s*[=+\-@＝＋－＠]/u.test(text))
  const str = formulaLike ? "'" + text : text
  if (formulaLike || /[,"\r\n]/u.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function* csvExport(rows: AsyncIterable<Record<string, unknown>>, headers: string[]): AsyncGenerator<string> {
  yield headers.join(',')
  for await (const row of rows) yield '\n' + headers.map(key => escapeCsvValue(row[key])).join(',')
}

const byId = { id: 'asc' } as const
async function* loadEntity(db: PrismaClient, type: EntityType): AsyncGenerator<Record<string, unknown>> {
  switch (type) {
    case 'switches':
      for await (const { tags, configured_vlans, is_favorite: _f, sort_order: _s, ...row } of exportRows(page => db.switch.findMany({ ...page, orderBy: byId }))) {
        yield { ...row, tags: JSON.parse(tags), configured_vlans: JSON.parse(configured_vlans) }
      }
      return
    case 'vlans':
      for await (const { is_favorite: _f, ...row } of exportRows(page => db.vlan.findMany({ ...page, orderBy: byId }))) yield row
      return
    case 'networks':
      for await (const { dns_servers, is_favorite: _f, ...row } of exportRows(page => db.network.findMany({ ...page, orderBy: byId }))) {
        yield { ...row, dns_servers: JSON.parse(dns_servers) }
      }
      return
    case 'allocations':
      yield* exportRows(page => db.ipAllocation.findMany({ ...page, orderBy: byId }))
      return
    case 'templates':
      for await (const { units, ...row } of exportRows(page => db.layoutTemplate.findMany({ ...page, orderBy: byId }))) {
        yield { ...row, units: JSON.parse(units) }
      }
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as EntityType
  const format = (query.format as ExportFormat) || 'json'

  if (!type || !Object.hasOwn(CSV_HEADERS, type)) {
    throw createError({ statusCode: 400, message: 'Invalid entity type. Must be one of: switches, vlans, networks, allocations, templates' })
  }
  if (format !== 'json' && format !== 'csv') {
    throw createError({ statusCode: 400, message: 'Invalid format. Must be json or csv' })
  }

  // A6: API tokens only get audited documentation entities with a positive field
  // allowlist (the CSV header list). Templates are not part of that contract.
  const isApiToken = getAuthContext(event)?.authType === 'api_token'
  if (isApiToken && type === 'templates') {
    throw createError({ statusCode: 403, message: 'Export of templates is not available for API tokens' })
  }

  const headers = CSV_HEADERS[type]
  const timestamp = new Date().toISOString().slice(0, 10)
  const contentType = format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json'

  return sendSnapshotExport(event, contentType, `ezswm-${type}-${timestamp}.${format}`, (db) => {
    const rows = (async function* () {
      for await (const row of loadEntity(db, type)) {
        yield isApiToken ? Object.fromEntries(headers.map(key => [key, row[key]])) : row
      }
    })()
    return format === 'csv' ? csvExport(rows, headers) : jsonExportArray(rows)
  })
})
