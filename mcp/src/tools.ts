import { z } from 'zod'
import type { EzswmClient } from './client.js'

/**
 * Read tools from the approved plan. Each tool is a thin mapping onto an
 * existing ezSWM REST GET route: the app owns authentication (API-token Bearer),
 * authorization (viewer read-only) and all business logic. Large collections are
 * capped so responses stay bounded.
 */
const CAP = 100

export interface ToolDefinition {
  name: string
  description: string
  schema: z.ZodObject<z.ZodRawShape>
  handler: (client: EzswmClient, args: Record<string, unknown>) => Promise<unknown>
}

const siteFilter = { site_id: z.string().min(1).optional().describe('Site ID or slug to scope the list') }

function capped<T>(items: T[], cap = CAP): { items: T[], total: number, more_available: boolean } {
  return { items: items.slice(0, cap), total: items.length, more_available: items.length > cap }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export const READ_TOOLS: ToolDefinition[] = [
  {
    name: 'list_sites',
    description: 'List all sites (documentation data).',
    schema: z.object({}),
    handler: client => client.get('/api/sites')
  },
  {
    name: 'get_site',
    description: 'Get one site by ID or slug, including entity counts.',
    schema: z.object({ id: z.string().min(1) }),
    handler: (client, args) => client.get(`/api/sites/${encodeURIComponent(String(args.id))}`)
  },
  {
    name: 'list_switches',
    description: 'List switches, optionally scoped to a site.',
    schema: z.object(siteFilter),
    handler: (client, args) => client.get('/api/switches', { siteId: args.site_id as string | undefined })
  },
  {
    name: 'get_switch',
    description: 'Get one switch by ID or slug, including its ports.',
    schema: z.object({ id: z.string().min(1) }),
    handler: (client, args) => client.get(`/api/switches/${encodeURIComponent(String(args.id))}`)
  },
  {
    name: 'list_vlans',
    description: 'List VLANs, optionally scoped to a site.',
    schema: z.object(siteFilter),
    handler: (client, args) => client.get('/api/vlans', { siteId: args.site_id as string | undefined })
  },
  {
    name: 'get_vlan',
    description: 'Get one VLAN by ID, including its networks.',
    schema: z.object({ id: z.string().min(1) }),
    handler: (client, args) => client.get(`/api/vlans/${encodeURIComponent(String(args.id))}`)
  },
  {
    name: 'list_networks',
    description: 'List networks, optionally scoped to a site.',
    schema: z.object(siteFilter),
    handler: (client, args) => client.get('/api/networks', { siteId: args.site_id as string | undefined })
  },
  {
    name: 'get_network',
    description: 'Get one network with its IP allocations and ranges (each capped at 100, with a more_available hint).',
    schema: z.object({ id: z.string().min(1) }),
    handler: async (client, args) => {
      const id = encodeURIComponent(String(args.id))
      const [network, allocations, ranges] = await Promise.all([
        client.get(`/api/networks/${id}`),
        client.get(`/api/networks/${id}/allocations`),
        client.get(`/api/networks/${id}/ranges`)
      ])
      return {
        network,
        allocations: capped(asArray(allocations)),
        ranges: capped(asArray(ranges))
      }
    }
  },
  {
    name: 'list_ip_allocations',
    description: 'List IP allocations of one network (capped at 100, with a more_available hint).',
    schema: z.object({ network_id: z.string().min(1) }),
    handler: async (client, args) => capped(asArray(await client.get(`/api/networks/${encodeURIComponent(String(args.network_id))}/allocations`)))
  },
  {
    name: 'list_ip_ranges',
    description: 'List IP ranges of one network.',
    schema: z.object({ network_id: z.string().min(1) }),
    handler: (client, args) => client.get(`/api/networks/${encodeURIComponent(String(args.network_id))}/ranges`)
  },
  {
    name: 'list_lags',
    description: 'List LAG groups of one switch.',
    schema: z.object({ switch_id: z.string().min(1) }),
    handler: (client, args) => client.get(`/api/switches/${encodeURIComponent(String(args.switch_id))}/lag-groups`)
  },
  {
    name: 'list_device_types',
    description: 'List device-type categories (custom and built-in availability).',
    schema: z.object({}),
    handler: client => client.get('/api/device-types')
  },
  {
    name: 'get_settings',
    description: 'Read ezSWM settings (read-only; settings writes are not available to API tokens).',
    schema: z.object({}),
    handler: client => client.get('/api/settings')
  },
  {
    name: 'subnet_info',
    description: 'Calculate subnet information for a CIDR (network, broadcast, usable range, host count).',
    schema: z.object({ cidr: z.string().min(1).describe('IPv4 CIDR, for example 10.0.1.0/24') }),
    handler: (client, args) => client.get('/api/subnet-calculator', { cidr: String(args.cidr) })
  },
  {
    name: 'search',
    description: 'Search switches, VLANs, networks, allocations, ranges, templates, LAG groups and patch panels by text (max 10 results per type).',
    schema: z.object({
      query: z.string().min(2),
      site_id: z.string().min(1).optional().describe('Optional site ID or slug to scope the search')
    }),
    handler: (client, args) => client.get('/api/search', { q: String(args.query), site_id: args.site_id as string | undefined })
  },
  {
    name: 'export_documentation_data',
    description: 'Export documentation data (sanitized allowlist) for switches, VLANs, networks or allocations as JSON or CSV.',
    schema: z.object({
      entity: z.enum(['switches', 'vlans', 'networks', 'allocations']),
      format: z.enum(['json', 'csv']).default('json'),
      limit: z.number().int().min(1).max(CAP).optional().describe(`Optional cap on returned JSON rows (max ${CAP})`)
    }),
    handler: async (client, args) => {
      const entity = String(args.entity)
      const format = String(args.format ?? 'json')
      const data = await client.get(`/api/export/${encodeURIComponent(entity)}`, { type: entity, format })
      if (format !== 'json' || !Array.isArray(data) || args.limit === undefined) return data
      return capped(data, Number(args.limit))
    }
  }
]
