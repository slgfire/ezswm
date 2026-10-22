import { z } from 'zod'
import type { EzswmClient, QueryValue } from './client.js'

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
    name: 'find_free_ip',
    description: 'Find free usable IP addresses in a network (advisory: another writer may take one first).',
    schema: z.object({
      network_id: z.string().min(1),
      count: z.number().int().min(1).max(CAP).default(1).describe(`How many free IPs to return (1-${CAP}, default 1)`)
    }),
    handler: (client, args) => client.get(`/api/networks/${encodeURIComponent(String(args.network_id))}/free-ips`, { count: args.count as number })
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
  },
  {
    name: 'list_activity',
    description: 'List the sanitized activity log (bounded, newest first) with undoability hints.',
    schema: z.object({
      limit: z.number().int().min(1).max(CAP).default(25).describe(`Page size (1-${CAP}, default 25)`),
      offset: z.number().int().min(0).max(100_000).default(0).describe('Rows to skip (0-100000, default 0)')
    }),
    handler: (client, args) => client.get('/api/activity/mcp', { limit: args.limit as number, offset: args.offset as number })
  }
]

/**
 * Write tools (admin API token). The thin mapping layer forwards request bodies
 * unchanged: ezSWM validators own field rules, ids, roles and conflict checks.
 */
const enc = (value: unknown): string => encodeURIComponent(String(value))

const errorNotes = 'Errors: 400 invalid body/parameters; 401 the API token is invalid (regenerate it); 403 the token user is not an admin; 404 target not found; 409 conflict (see the tool description).'

const dataParam = z.record(z.string(), z.unknown())
  .describe('Entity fields passed unchanged to the ezSWM API. The API validates them; see the ezSWM API/OpenAPI for the accepted fields.')

const deleteGuardParams = {
  confirm: z.boolean().optional()
    .describe('Acknowledgement only, not human approval: obtaining approval is the client/operator responsibility. Omit to receive a non-destructive preview.'),
  expectedImpactToken: z.string().min(1).optional()
    .describe('impactToken from a preview of exactly these parameters. Required when confirm is true.')
}

const undoGuardParams = {
  confirm: z.boolean().optional()
    .describe('Acknowledgement only, not human approval: obtaining approval is the client/operator responsibility. Omit to receive a non-destructive preview.'),
  expectedUndoToken: z.string().min(1).optional()
    .describe('undoToken from a preview of exactly this activity entry. Required when confirm is true.')
}

type ToolArgs = Record<string, unknown>

interface WriteToolSpec {
  name: string
  description: string
  schema: z.ZodObject<z.ZodRawShape>
  method: 'POST' | 'PUT'
  path: (args: ToolArgs) => string
  query?: (args: ToolArgs) => Record<string, QueryValue>
  body: (args: ToolArgs) => unknown
}

function writeTool(spec: WriteToolSpec): ToolDefinition {
  return {
    name: spec.name,
    description: spec.description,
    schema: spec.schema,
    handler: (client, args) => {
      const path = spec.path(args)
      const query = spec.query ? spec.query(args) : {}
      const body = spec.body(args)
      return spec.method === 'POST' ? client.post(path, body, query) : client.put(path, body, query)
    }
  }
}

interface DeleteToolSpec {
  name: string
  description: string
  schema: z.ZodObject<z.ZodRawShape>
  path: (args: ToolArgs) => string
  query?: (args: ToolArgs) => Record<string, QueryValue>
  body?: (args: ToolArgs) => unknown
}

/**
 * A5 delete mapping: no `confirm` -> server preview (impact + impactToken);
 * `confirm` + token -> execute. A stale token returns 409 with a fresh preview
 * and impactToken in the error payload; nothing was deleted.
 */
function deleteTool(spec: DeleteToolSpec): ToolDefinition {
  return {
    name: spec.name,
    description: spec.description,
    schema: spec.schema,
    handler: (client, args) => client.delete(
      spec.path(args),
      {
        ...(spec.query ? spec.query(args) : {}),
        confirm: args.confirm === true ? 'true' : undefined,
        expectedImpactToken: typeof args.expectedImpactToken === 'string' ? args.expectedImpactToken : undefined
      },
      spec.body ? spec.body(args) : undefined
    )
  }
}

function deleteDescription(entity: string, detail: string, conflict: string): string {
  return `Delete ${entity} (irreversible). ${detail} Without confirm this returns a non-destructive preview with an impactToken; call again with confirm:true and that expectedImpactToken to execute. confirm is an acknowledgement only — human approval is the client/operator's responsibility. ${errorNotes} 409: ${conflict}.`
}

const siteQuery = (args: ToolArgs): Record<string, QueryValue> => ({ siteId: args.site_id as string | undefined })

export const WRITE_TOOLS: ToolDefinition[] = [
  writeTool({
    name: 'create_switch',
    description: `Create a switch. ${errorNotes} 409: the switch name already exists in the site or the group is invalid.`,
    schema: z.object({ data: dataParam }),
    method: 'POST',
    path: () => '/api/switches',
    body: args => args.data
  }),
  writeTool({
    name: 'update_switch',
    description: `Update a switch (pass id, or a site-scoped slug plus site_id). ${errorNotes} 409: duplicate switch name in the site, or a stale expected_updated_at in data.`,
    schema: z.object({
      id: z.string().min(1),
      site_id: z.string().min(1).optional().describe('Site ID or slug, only needed to disambiguate a switch slug'),
      data: dataParam
    }),
    method: 'PUT',
    path: args => `/api/switches/${enc(args.id)}`,
    query: siteQuery,
    body: args => args.data
  }),
  writeTool({
    name: 'update_port',
    description: `Update one switch port. ${errorNotes} 409: stale expected_updated_at (the payload carries current_updated_at), LAG/peer/VLAN rule violation, or counterpart status conflict (data.reason).`,
    schema: z.object({
      switch_id: z.string().min(1).describe('Switch ID or site-disambiguated slug'),
      port_id: z.string().min(1),
      site_id: z.string().min(1).optional(),
      data: dataParam
    }),
    method: 'PUT',
    path: args => `/api/switches/${enc(args.switch_id)}/ports/${enc(args.port_id)}`,
    query: siteQuery,
    body: args => args.data
  }),
  writeTool({
    name: 'update_ports',
    description: `Bulk-update switch ports (port_ids + updates; peer/LAG sync uses this same bulk semantics). ${errorNotes} 409: stale expected_updated_at (payload carries current_updated_at), ports not belonging to the switch, or targets not matching the given LAG group.`,
    schema: z.object({
      switch_id: z.string().min(1).describe('Switch ID or site-disambiguated slug'),
      site_id: z.string().min(1).optional(),
      data: dataParam.describe('Bulk update body: { port_ids, updates, expected_updated_at?, lag_group_id?, apply_after_copy_prefill? }, passed unchanged.')
    }),
    method: 'PUT',
    path: args => `/api/switches/${enc(args.switch_id)}/ports/bulk`,
    query: siteQuery,
    body: args => args.data
  }),
  writeTool({
    name: 'create_vlan',
    description: `Create a VLAN (a color is auto-assigned when omitted). ${errorNotes} 409: VLAN ID or color already used in the site.`,
    schema: z.object({ data: dataParam }),
    method: 'POST',
    path: () => '/api/vlans',
    body: args => args.data
  }),
  writeTool({
    name: 'update_vlan',
    description: `Update a VLAN. ${errorNotes} 409: VLAN ID or color already used in the site. There is no expected_updated_at precondition on this route.`,
    schema: z.object({ id: z.string().min(1), data: dataParam }),
    method: 'PUT',
    path: args => `/api/vlans/${enc(args.id)}`,
    body: args => args.data
  }),
  deleteTool({
    name: 'delete_vlan',
    description: deleteDescription(
      'a VLAN',
      'Networks referencing it are untagged (vlan_id cleared); port VLAN numbers stay.',
      'stale impactToken/state, or the preview is blocked with VLAN_NETWORK_SUBNET_CONFLICT when deleting would duplicate subnets in the untagged site scope (the error payload contains the fresh preview/conflicts)'
    ),
    schema: z.object({ id: z.string().min(1), ...deleteGuardParams }),
    path: args => `/api/vlans/${enc(args.id)}`
  }),
  writeTool({
    name: 'create_network',
    description: `Create a network. ${errorNotes} 409: subnet overlaps an existing network.`,
    schema: z.object({ data: dataParam }),
    method: 'POST',
    path: () => '/api/networks',
    body: args => args.data
  }),
  writeTool({
    name: 'update_network',
    description: `Update a network (pass id, or a site-scoped slug plus site_id). ${errorNotes} 409: subnet conflict. There is no expected_updated_at precondition on this route.`,
    schema: z.object({
      id: z.string().min(1),
      site_id: z.string().min(1).optional().describe('Site ID or slug, only needed to disambiguate a network slug'),
      data: dataParam
    }),
    method: 'PUT',
    path: args => `/api/networks/${enc(args.id)}`,
    query: siteQuery,
    body: args => args.data
  }),
  deleteTool({
    name: 'delete_network',
    description: deleteDescription(
      'a network',
      'Its IP allocations and ranges are deleted and allocation links on ports are cleared.',
      'stale impactToken/state (the error payload contains the fresh preview and impactToken)'
    ),
    schema: z.object({
      id: z.string().min(1),
      site_id: z.string().min(1).optional().describe('Site ID or slug, only needed to disambiguate a network slug'),
      ...deleteGuardParams
    }),
    path: args => `/api/networks/${enc(args.id)}`,
    query: siteQuery
  }),
  writeTool({
    name: 'create_ip_allocation',
    description: `Create an IP allocation in a network. ${errorNotes} 409: the IP address is already allocated.`,
    schema: z.object({ network_id: z.string().min(1), data: dataParam }),
    method: 'POST',
    path: args => `/api/networks/${enc(args.network_id)}/allocations`,
    body: args => args.data
  }),
  writeTool({
    name: 'update_ip_allocation',
    description: `Update an IP allocation in a network. ${errorNotes} 409: the IP address is already allocated. There is no expected_updated_at precondition on this route.`,
    schema: z.object({
      network_id: z.string().min(1),
      allocation_id: z.string().min(1),
      data: dataParam
    }),
    method: 'PUT',
    path: args => `/api/networks/${enc(args.network_id)}/allocations/${enc(args.allocation_id)}`,
    body: args => args.data
  }),
  deleteTool({
    name: 'delete_ip_allocation',
    description: deleteDescription(
      'an IP allocation',
      'Ports linked to it are listed in the preview; the foreign key clears those links and peer links stay intact.',
      'stale impactToken/state (the error payload contains the fresh preview and impactToken)'
    ),
    schema: z.object({
      network_id: z.string().min(1),
      allocation_id: z.string().min(1),
      ...deleteGuardParams
    }),
    path: args => `/api/networks/${enc(args.network_id)}/allocations/${enc(args.allocation_id)}`
  }),
  writeTool({
    name: 'create_ip_range',
    description: `Create an IP range in a network. ${errorNotes} 409: the range overlaps an existing range.`,
    schema: z.object({ network_id: z.string().min(1), data: dataParam }),
    method: 'POST',
    path: args => `/api/networks/${enc(args.network_id)}/ranges`,
    body: args => args.data
  }),
  writeTool({
    name: 'update_ip_range',
    description: `Update an IP range. ${errorNotes} 409: the range overlaps an existing range. There is no expected_updated_at precondition on this route.`,
    schema: z.object({
      network_id: z.string().min(1),
      range_id: z.string().min(1),
      data: dataParam
    }),
    method: 'PUT',
    path: args => `/api/networks/${enc(args.network_id)}/ranges/${enc(args.range_id)}`,
    body: args => args.data
  }),
  deleteTool({
    name: 'delete_ip_range',
    description: deleteDescription(
      'an IP range',
      'The delete is row-only; nothing else references the range.',
      'stale impactToken/state (the error payload contains the fresh preview and impactToken)'
    ),
    schema: z.object({
      network_id: z.string().min(1),
      range_id: z.string().min(1),
      ...deleteGuardParams
    }),
    path: args => `/api/networks/${enc(args.network_id)}/ranges/${enc(args.range_id)}`
  }),
  writeTool({
    name: 'create_lag',
    description: `Create a LAG group on a switch. ${errorNotes} 409: duplicate LAG name, a port already in another LAG, or a stale expected_updated_at in data.`,
    schema: z.object({
      switch_id: z.string().min(1).describe('Switch ID or site-disambiguated slug'),
      site_id: z.string().min(1).optional(),
      data: dataParam
    }),
    method: 'POST',
    path: args => `/api/switches/${enc(args.switch_id)}/lag-groups`,
    query: siteQuery,
    body: args => args.data
  }),
  writeTool({
    name: 'update_lag',
    description: `Update a LAG group. ${errorNotes} 409: duplicate LAG name, port already in another LAG, remote-device mismatch, or a stale expected_updated_at in data.`,
    schema: z.object({
      switch_id: z.string().min(1).describe('Switch ID or site-disambiguated slug'),
      lag_id: z.string().min(1),
      site_id: z.string().min(1).optional(),
      data: dataParam
    }),
    method: 'PUT',
    path: args => `/api/switches/${enc(args.switch_id)}/lag-groups/${enc(args.lag_id)}`,
    query: siteQuery,
    body: args => args.data
  }),
  deleteTool({
    name: 'delete_lag',
    description: deleteDescription(
      'a LAG group',
      'The delete options delete_remote and reset_ports are part of the preview and the impactToken, so changing them requires a new preview.',
      'stale impactToken/options or the remote mirror cannot be uniquely identified; nothing was deleted (the error payload contains the fresh preview and impactToken)'
    ),
    schema: z.object({
      switch_id: z.string().min(1).describe('Switch ID or site-disambiguated slug'),
      lag_id: z.string().min(1),
      site_id: z.string().min(1).optional(),
      delete_remote: z.boolean().optional().describe('Also delete the remote mirror LAG (default false)'),
      reset_ports: z.boolean().optional().describe('Reset the member ports instead of detaching them (default false)'),
      ...deleteGuardParams
    }),
    path: args => `/api/switches/${enc(args.switch_id)}/lag-groups/${enc(args.lag_id)}`,
    query: siteQuery,
    body: args => ({ delete_remote: args.delete_remote === true, reset_ports: args.reset_ports === true })
  }),
  writeTool({
    name: 'create_device_type',
    description: `Create a device-type category. ${errorNotes} 409: the name already exists.`,
    schema: z.object({ name: z.string().min(1).describe('Category name') }),
    method: 'POST',
    path: () => '/api/device-types',
    body: args => ({ name: args.name })
  }),
  writeTool({
    name: 'update_device_type',
    description: `Rename a device-type category. ${errorNotes} 409: the name already exists. There is no expected_updated_at precondition on this route.`,
    schema: z.object({ id: z.string().min(1), name: z.string().min(1) }),
    method: 'PUT',
    path: args => `/api/device-types/${enc(args.id)}`,
    body: args => ({ name: args.name })
  }),
  writeTool({
    name: 'undo_activity',
    description: `Undo one activity entry (admin only; recent VLAN, network, IP allocation/range and site actions are undoable). Without confirm this returns a non-destructive preview with an undoToken; call again with confirm:true and that expectedUndoToken to execute. confirm is an acknowledgement only — human approval is the client/operator's responsibility. ${errorNotes} 409: stale undoToken/state (the error payload contains the fresh preview and undoToken); 422: the entry is not undoable (reason in the error payload).`,
    schema: z.object({ id: z.string().min(1), ...undoGuardParams }),
    method: 'POST',
    path: args => `/api/activity/mcp/${enc(args.id)}/undo`,
    query: args => ({
      confirm: args.confirm === true ? 'true' : undefined,
      expectedUndoToken: typeof args.expectedUndoToken === 'string' ? args.expectedUndoToken : undefined
    }),
    body: () => undefined
  }),
  {
    name: 'import_documentation_data',
    description: `Import documentation rows for one entity. The API validates each row and imports it individually: the result reports total, imported, skipped (duplicates) and per-row errors. This is best-effort and partial success is possible — there is NO global rollback; rerun only the failed rows. ${errorNotes}`,
    schema: z.object({
      entity: z.enum(['switches', 'vlans', 'networks', 'allocations', 'ranges']),
      rows: z.array(z.record(z.string(), z.unknown())).min(1).max(5000)
        .describe('Rows in the same shape as the sanitized JSON export or the documented CSV columns')
    }),
    handler: (client, args) => client.post(`/api/import/${enc(args.entity)}`, { data: args.rows })
  }
]
