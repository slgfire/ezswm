import { prisma } from '../../db/client'

type EntityType = 'switches' | 'vlans' | 'networks' | 'allocations' | 'templates'
type ExportFormat = 'json' | 'csv'

const CSV_HEADERS: Record<EntityType, string[]> = {
  switches: ['id', 'site_id', 'name', 'model', 'manufacturer', 'serial_number', 'location', 'rack_position', 'management_ip', 'firmware_version', 'layout_template_id', 'notes', 'created_at', 'updated_at'],
  vlans: ['id', 'site_id', 'vlan_id', 'name', 'description', 'status', 'routing_device', 'color', 'created_at', 'updated_at'],
  networks: ['id', 'site_id', 'name', 'vlan_id', 'subnet', 'gateway', 'dns_servers', 'description', 'created_at', 'updated_at'],
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

async function loadEntity(type: EntityType): Promise<Record<string, unknown>[]> {
  switch (type) {
    case 'switches': {
      const rows = await prisma.switch.findMany()
      return rows.map(({ tags, configured_vlans, is_favorite: _f, sort_order: _s, ...rest }) => ({
        ...rest,
        // Hide internal JSON columns from the export; they're awkward in CSV.
        tags: JSON.parse(tags) as string[],
        configured_vlans: JSON.parse(configured_vlans) as number[]
      }))
    }
    case 'vlans': {
      const rows = await prisma.vlan.findMany()
      return rows.map(({ is_favorite: _f, ...rest }) => rest)
    }
    case 'networks': {
      const rows = await prisma.network.findMany()
      return rows.map(({ dns_servers, is_favorite: _f, ...rest }) => ({
        ...rest,
        dns_servers: JSON.parse(dns_servers) as string[]
      }))
    }
    case 'allocations':
      return prisma.ipAllocation.findMany() as unknown as Promise<Record<string, unknown>[]>
    case 'templates': {
      const rows = await prisma.layoutTemplate.findMany()
      return rows.map(({ units, ...rest }) => ({ ...rest, units: JSON.parse(units) }))
    }
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as EntityType
  const format = (query.format as ExportFormat) || 'json'

  if (!type || !(type in CSV_HEADERS)) {
    throw createError({ statusCode: 400, message: 'Invalid entity type. Must be one of: switches, vlans, networks, allocations, templates' })
  }
  if (format !== 'json' && format !== 'csv') {
    throw createError({ statusCode: 400, message: 'Invalid format. Must be json or csv' })
  }

  let data = await loadEntity(type)

  // Templates: drop the nested units column from CSV (too complex).
  if (type === 'templates' && format === 'csv') {
    data = data.map(({ units: _u, ...rest }) => rest)
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
