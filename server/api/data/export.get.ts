import { readJson } from '../../storage/jsonStorage'

type EntityType = 'switches' | 'vlans' | 'networks' | 'allocations' | 'templates'
type ExportFormat = 'json' | 'csv'

const ENTITY_FILE_MAP: Record<EntityType, string> = {
  switches: 'switches.json',
  vlans: 'vlans.json',
  networks: 'networks.json',
  allocations: 'ipAllocations.json',
  templates: 'layoutTemplates.json'
}

const CSV_HEADERS: Record<EntityType, string[]> = {
  switches: ['id', 'name', 'model', 'manufacturer', 'serial_number', 'location', 'rack_position', 'management_ip', 'firmware_version', 'layout_template_id', 'notes', 'created_at', 'updated_at'],
  vlans: ['id', 'vlan_id', 'name', 'description', 'status', 'routing_device', 'color', 'created_at', 'updated_at'],
  networks: ['id', 'name', 'vlan_id', 'subnet', 'gateway', 'dns_servers', 'description', 'created_at', 'updated_at'],
  allocations: ['id', 'network_id', 'ip_address', 'hostname', 'mac_address', 'device_type', 'description', 'status', 'created_at', 'updated_at'],
  templates: ['id', 'name', 'manufacturer', 'model', 'description', 'created_at', 'updated_at']
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = Array.isArray(value) ? value.join(';') : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(data: Record<string, unknown>[], headers: string[]): string {
  const lines = [headers.join(',')]
  for (const row of data) {
    const values = headers.map(h => escapeCsvValue(row[h]))
    lines.push(values.join(','))
  }
  return lines.join('\n')
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const type = query.type as EntityType
  const format = (query.format as ExportFormat) || 'json'

  if (!type || !ENTITY_FILE_MAP[type]) {
    throw createError({ statusCode: 400, message: 'Invalid entity type. Must be one of: switches, vlans, networks, allocations, templates' })
  }

  if (format !== 'json' && format !== 'csv') {
    throw createError({ statusCode: 400, message: 'Invalid format. Must be json or csv' })
  }

  let data = readJson<Record<string, unknown>[]>(ENTITY_FILE_MAP[type])

  // Strip ports array from switches (too large)
  if (type === 'switches') {
    data = data.map(({ ports, is_favorite, sort_order, ...rest }) => rest)
  }

  // Strip is_favorite from vlans and networks
  if (type === 'vlans' || type === 'networks') {
    data = data.map(({ is_favorite, ...rest }) => rest)
  }

  // Strip units from templates for CSV (complex nested structure)
  if (type === 'templates' && format === 'csv') {
    data = data.map(({ units, ...rest }) => rest)
  }

  const headers = CSV_HEADERS[type]
  const timestamp = new Date().toISOString().slice(0, 10)

  if (format === 'csv') {
    const csv = toCsv(data, headers)
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="ezswm-${type}-${timestamp}.csv"`)
    return csv
  }

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="ezswm-${type}-${timestamp}.json"`)
  return data
})
