import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

import { EzswmApiError, EzswmClient } from '../src/client.js'
import { ConfigError, loadConfig } from '../src/config.js'
import { READ_TOOLS, WRITE_TOOLS } from '../src/tools.js'
import { createEzswmMcpServer } from '../src/server.js'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const env = (over: Record<string, string | undefined> = {}) => ({
  EZSWM_URL: 'https://ezswm.example.com',
  EZSWM_TOKEN: 'ezswm_' + 'a'.repeat(32),
  ...over
})

describe('config', () => {
  it('accepts HTTPS with an API token and strips the trailing slash', async () => {
    expect(await loadConfig(env({ EZSWM_URL: 'https://ezswm.example.com/' }))).toMatchObject({
      baseUrl: 'https://ezswm.example.com',
      timeoutMs: 15_000
    })
  })

  it('reads the token from EZSWM_TOKEN_FILE and allows loopback HTTP', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ezswm-mcp-'))
    const file = join(dir, 'token')
    await writeFile(file, 'ezswm_filetoken\n')
    const cfg = await loadConfig({ EZSWM_URL: 'http://127.0.0.1:3000', EZSWM_TOKEN_FILE: file })
    expect(cfg.token).toBe('ezswm_filetoken')
  })

  it.each([
    [{ EZSWM_URL: undefined }, /EZSWM_URL is required/],
    [{ EZSWM_URL: 'https://ezswm.example.com', EZSWM_TOKEN: undefined }, /EZSWM_TOKEN or EZSWM_TOKEN_FILE/],
    [{ EZSWM_URL: 'https://user:pw@ezswm.example.com' }, /must not contain credentials/],
    [{ EZSWM_URL: 'http://ezswm.lan' }, /must use HTTPS/],
    [{ EZSWM_TOKEN: 'not-a-token' }, /does not look like an ezSWM API token/]
  ])('rejects invalid configuration (%#)', async (over, message) => {
    await expect(loadConfig(env(over))).rejects.toThrow(ConfigError)
    await expect(loadConfig(env(over))).rejects.toThrow(message)
  })
})

describe('HTTP client', () => {
  beforeEach(() => vi.unstubAllGlobals())
  afterEach(() => vi.unstubAllGlobals())

  it('sends the API token as a Bearer header and maps query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([{ id: 'n1' }]))
    vi.stubGlobal('fetch', fetchMock)
    const client = new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_t' })
    await expect(client.get('/api/networks', { siteId: 'hq', empty: '' })).resolves.toEqual([{ id: 'n1' }])

    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe('https://ezswm.example.com/api/networks?siteId=hq')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer ezswm_t' })
    expect((init as RequestInit).redirect).toBe('error')
  })

  it('maps 401 to a regeneration hint and keeps the API error payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Invalid token', data: { code: 'E' } }, 401)))
    const client = new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_t' })
    const err = await client.get('/api/sites').catch(e => e)
    expect(err).toBeInstanceOf(EzswmApiError)
    expect((err as EzswmApiError).status).toBe(401)
    expect((err as EzswmApiError).message).toMatch(/Regenerate the token/)
    expect((err as EzswmApiError).data).toEqual({ code: 'E' })
  })

  it('rejects non-JSON success responses and network failures with readable errors', async () => {
    const client = new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_t' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })))
    await expect(client.get('/api/sites')).rejects.toThrow(/non-JSON/)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(client.get('/api/sites')).rejects.toThrow(/Cannot reach ezSWM/)
  })
})

describe('read tools', () => {
  beforeEach(() => vi.unstubAllGlobals())
  afterEach(() => vi.unstubAllGlobals())

  it('exposes the approved read surface with unique names and no denied operations', () => {
    const names = READ_TOOLS.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(expect.arrayContaining([
      'list_sites', 'get_site', 'list_switches', 'get_switch', 'list_vlans', 'get_vlan',
      'list_networks', 'get_network', 'list_ip_allocations', 'list_ip_ranges', 'find_free_ip',
      'list_lags', 'list_device_types', 'get_settings', 'subnet_info', 'search',
      'list_activity', 'export_documentation_data'
    ]))
    expect(names.some(n => /delete|update|create|undo|backup|user/i.test(n))).toBe(false)
  })

  it('caps get_network allocations/ranges and reports more_available', async () => {
    const allocations = Array.from({ length: 150 }, (_, i) => ({ id: `a${i}` }))
    vi.stubGlobal('fetch', vi.fn(async (input: URL | string) => {
      const path = new URL(String(input)).pathname
      if (path.endsWith('/allocations')) return json(allocations)
      if (path.endsWith('/ranges')) return json([{ id: 'r1' }])
      return json({ id: 'n1', name: 'Net' })
    }))
    const client = new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_t' })
    const tool = READ_TOOLS.find(t => t.name === 'get_network')!
    const result = await tool.handler(client, tool.schema.parse({ id: 'n1' })) as {
      allocations: { items: unknown[], total: number, more_available: boolean }
    }
    expect(result.allocations.items).toHaveLength(100)
    expect(result.allocations.total).toBe(150)
    expect(result.allocations.more_available).toBe(true)
  })

  it('maps export_documentation_data onto the sanitized export route and caps JSON rows', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(Array.from({ length: 5 }, (_, i) => ({ id: `x${i}` }))))
    vi.stubGlobal('fetch', fetchMock)
    const client = new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_t' })
    const tool = READ_TOOLS.find(t => t.name === 'export_documentation_data')!
    const result = await tool.handler(client, tool.schema.parse({ entity: 'networks', format: 'json', limit: 2 })) as { items: unknown[] }
    expect(result.items).toHaveLength(2)
    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(url.pathname).toBe('/api/export/networks')
    expect(url.searchParams.get('format')).toBe('json')
  })

  it('finds free IPs with a bounded count (default 1)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ network_id: 'n1', subnet: '10.0.0.0/24', count: 1, free_ips: ['10.0.0.2'] }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_t' })
    const tool = READ_TOOLS.find(t => t.name === 'find_free_ip')!
    expect(tool.schema.parse({ network_id: 'n1' }).count).toBe(1)

    const result = await tool.handler(client, tool.schema.parse({ network_id: 'n1', count: 3 })) as { free_ips: string[] }
    expect(result.free_ips).toEqual(['10.0.0.2'])
    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(url.pathname).toBe('/api/networks/n1/free-ips')
    expect(url.searchParams.get('count')).toBe('3')
  })

  it('lists the sanitized activity log with bounded pagination', async () => {
    const rows = [{ id: 'a1', action: 'update', entity_type: 'vlan', undoable: true }]
    const fetchMock = vi.fn().mockResolvedValue(json({ data: rows, total: 1, limit: 10, offset: 5 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_t' })
    const tool = READ_TOOLS.find(t => t.name === 'list_activity')!
    const result = await tool.handler(client, tool.schema.parse({ limit: 10, offset: 5 })) as { data: unknown[] }
    expect(result.data).toEqual(rows)
    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(url.pathname).toBe('/api/activity/mcp')
    expect(url.searchParams.get('limit')).toBe('10')
    expect(url.searchParams.get('offset')).toBe('5')
  })
})

describe('write tools', () => {
  beforeEach(() => vi.unstubAllGlobals())
  afterEach(() => vi.unstubAllGlobals())

  const tool = (name: string) => WRITE_TOOLS.find(t => t.name === name)!
  const run = (name: string, args: Record<string, unknown>) => {
    const definition = tool(name)
    return definition.handler(
      new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_t' }),
      definition.schema.parse(args) as Record<string, unknown>
    )
  }

  it('exposes exactly the approved write surface and no excluded operations', () => {
    const names = WRITE_TOOLS.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual([
      'create_switch', 'update_switch', 'update_port', 'update_ports',
      'create_vlan', 'update_vlan', 'delete_vlan',
      'create_network', 'update_network', 'delete_network',
      'create_ip_allocation', 'update_ip_allocation', 'delete_ip_allocation',
      'create_ip_range', 'update_ip_range', 'delete_ip_range',
      'create_lag', 'update_lag', 'delete_lag',
      'create_device_type', 'update_device_type', 'undo_activity', 'import_documentation_data'
    ])
    expect(names).not.toContain('delete_switch')
    expect(names).not.toContain('delete_device_type')
    expect(names.some(n => /site|user|backup|settings|patch/i.test(n))).toBe(false)
  })

  it('passes arbitrary entity fields through unchanged (no duplicated API validation)', async () => {
    const fetchMock = vi.fn(async () => json({ id: 's1' }, 201))
    vi.stubGlobal('fetch', fetchMock)
    const body = { site_id: 'hq', name: 'sw1', notes: 'kept', future_field: { nested: true } }
    await run('create_switch', { data: body })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe('https://ezswm.example.com/api/switches')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual(body)
    expect((init as RequestInit).headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('maps nested resource paths, site disambiguation and bulk bodies onto the REST routes', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await run('update_port', { switch_id: 'sw1', port_id: 'p1', site_id: 'hq', data: { status: 'up' } })
    let [url, init] = fetchMock.mock.calls[0]!
    expect((init as RequestInit).method).toBe('PUT')
    expect(new URL(String(url)).pathname).toBe('/api/switches/sw1/ports/p1')
    expect(new URL(String(url)).searchParams.get('siteId')).toBe('hq')

    await run('update_ports', { switch_id: 'sw1', data: { port_ids: ['p1', 'p2'], updates: { status: 'down' } } })
    ;[url, init] = fetchMock.mock.calls[1]!
    expect(new URL(String(url)).pathname).toBe('/api/switches/sw1/ports/bulk')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ port_ids: ['p1', 'p2'], updates: { status: 'down' } })
  })

  it('previews a delete without confirm and executes only with confirm + impact token', async () => {
    const fetchMock = vi.fn(async () => json({ preview: true, impactToken: 'tok' }))
    vi.stubGlobal('fetch', fetchMock)

    await run('delete_vlan', { id: 'v1' })
    const init = fetchMock.mock.calls[0]![1]
    let url = fetchMock.mock.calls[0]![0]
    expect((init as RequestInit).method).toBe('DELETE')
    expect((init as RequestInit).body).toBeUndefined()
    expect(new URL(String(url)).searchParams.get('confirm')).toBeNull()
    expect(new URL(String(url)).searchParams.get('expectedImpactToken')).toBeNull()

    await run('delete_vlan', { id: 'v1', confirm: true, expectedImpactToken: 'tok' })
    ;[url] = fetchMock.mock.calls[1]!
    expect(new URL(String(url)).searchParams.get('confirm')).toBe('true')
    expect(new URL(String(url)).searchParams.get('expectedImpactToken')).toBe('tok')
  })

  it('sends LAG delete options as body so they participate in the preview and token', async () => {
    const fetchMock = vi.fn(async () => json({ preview: true, impactToken: 'tok' }))
    vi.stubGlobal('fetch', fetchMock)
    await run('delete_lag', { switch_id: 'sw1', lag_id: 'l1', delete_remote: true, reset_ports: true })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(new URL(String(url)).pathname).toBe('/api/switches/sw1/lag-groups/l1')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ delete_remote: true, reset_ports: true })
  })

  it('maps missing impact token (400) and stale token (409 + fresh preview) to readable errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({
      statusMessage: 'expectedImpactToken is required: preview first, then pass its impactToken with confirm=true'
    }, 400)))
    const missing = await run('delete_ip_allocation', { network_id: 'n1', allocation_id: 'a1', confirm: true }).catch(e => e)
    expect(missing).toBeInstanceOf(EzswmApiError)
    expect((missing as EzswmApiError).status).toBe(400)
    expect((missing as EzswmApiError).message).toMatch(/expectedImpactToken is required/)

    vi.stubGlobal('fetch', vi.fn(async () => json({
      statusMessage: 'Network state changed since the preview; re-fetch the impact and confirm again',
      data: { requiresConfirmation: true, impactToken: 'fresh-token', impact: { network: { id: 'n1' } } }
    }, 409)))
    const stale = await run('delete_network', { id: 'n1', confirm: true, expectedImpactToken: 'old' }).catch(e => e)
    expect(stale).toBeInstanceOf(EzswmApiError)
    expect((stale as EzswmApiError).status).toBe(409)
    expect((stale as EzswmApiError).data).toEqual({
      requiresConfirmation: true,
      impactToken: 'fresh-token',
      impact: { network: { id: 'n1' } }
    })
  })

  it('maps 401, 403 and 404 with actionable messages', async () => {
    for (const [status, pattern, payload] of [
      [401, /Regenerate the token/, { message: 'Invalid token' }],
      [403, /not allowed/, { message: 'Administrator access required' }],
      [404, /Not found/, { message: 'VLAN not found' }]
    ] as const) {
      vi.stubGlobal('fetch', vi.fn(async () => json(payload, status)))
      const err = await run('update_vlan', { id: 'v1', data: { name: 'x' } }).catch(e => e)
      expect((err as EzswmApiError).status).toBe(status)
      expect((err as EzswmApiError).message).toMatch(pattern)
      expect((err as EzswmApiError).message).toContain((payload as { message: string }).message)
    }
  })

  it('previews an activity undo without confirm and executes with the expected undo token', async () => {
    const fetchMock = vi.fn(async () => json({ preview: true, requiresConfirmation: true, undoToken: 'tok' }))
    vi.stubGlobal('fetch', fetchMock)

    await run('undo_activity', { id: 'a1' })
    const init = fetchMock.mock.calls[0]![1]
    let url = fetchMock.mock.calls[0]![0]
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).body).toBeUndefined()
    expect(new URL(String(url)).pathname).toBe('/api/activity/mcp/a1/undo')
    expect(new URL(String(url)).searchParams.get('confirm')).toBeNull()
    expect(new URL(String(url)).searchParams.get('expectedUndoToken')).toBeNull()

    await run('undo_activity', { id: 'a1', confirm: true, expectedUndoToken: 'tok' })
    ;[url] = fetchMock.mock.calls[1]!
    expect(new URL(String(url)).searchParams.get('confirm')).toBe('true')
    expect(new URL(String(url)).searchParams.get('expectedUndoToken')).toBe('tok')
  })

  it('maps undo_activity 401, 404 and a stale-token 409 with the fresh preview', async () => {
    for (const [status, pattern, payload] of [
      [401, /Regenerate the token/, { message: 'Invalid token' }],
      [404, /Not found/, { message: 'Activity entry not found' }]
    ] as const) {
      vi.stubGlobal('fetch', vi.fn(async () => json(payload, status)))
      const err = await run('undo_activity', { id: 'a1' }).catch(e => e)
      expect(err).toBeInstanceOf(EzswmApiError)
      expect((err as EzswmApiError).status).toBe(status)
      expect((err as EzswmApiError).message).toMatch(pattern)
    }

    vi.stubGlobal('fetch', vi.fn(async () => json({
      message: 'State changed since the preview; re-preview and confirm again',
      data: { requiresConfirmation: true, undoToken: 'fresh-undo', activity: { id: 'a1' } }
    }, 409)))
    const stale = await run('undo_activity', { id: 'a1', confirm: true, expectedUndoToken: 'old' }).catch(e => e)
    expect(stale).toBeInstanceOf(EzswmApiError)
    expect((stale as EzswmApiError).status).toBe(409)
    expect((stale as EzswmApiError).data).toEqual({
      requiresConfirmation: true,
      undoToken: 'fresh-undo',
      activity: { id: 'a1' }
    })
  })

  it('creates device types and imports documentation rows via the sanitized routes', async () => {
    const fetchMock = vi.fn(async () => json({ imported: 1, skipped: 0, errors: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await run('create_device_type', { name: 'Access' })
    let [url, init] = fetchMock.mock.calls[0]!
    expect(new URL(String(url)).pathname).toBe('/api/device-types')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ name: 'Access' })

    await run('import_documentation_data', { entity: 'vlans', rows: [{ vlan_id: 10, name: 'Users' }] })
    ;[url, init] = fetchMock.mock.calls[1]!
    expect(new URL(String(url)).pathname).toBe('/api/import/vlans')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ data: [{ vlan_id: 10, name: 'Users' }] })
  })
})

describe('write tools over in-memory transport', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('registers write tools and surfaces a stale-token 409 with the fresh preview text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({
      message: 'State changed since the preview',
      data: { requiresConfirmation: true, impactToken: 'fresh' }
    }, 409)))
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = createEzswmMcpServer(
      new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_secret' }),
      { name: 'ezswm-mcp-test', version: '0.0.0-test' }
    )
    const client = new Client({ name: 'test-client', version: '0.0.0-test' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const { tools } = await client.listTools()
    expect(tools.map(t => t.name)).toEqual(expect.arrayContaining([
      'create_switch', 'update_port', 'delete_vlan', 'delete_network', 'delete_ip_allocation',
      'delete_ip_range', 'delete_lag', 'update_device_type', 'import_documentation_data'
    ]))

    const result = await client.callTool({
      name: 'delete_vlan',
      arguments: { id: 'v1', confirm: true, expectedImpactToken: 'stale' }
    }) as { content: Array<{ text: string }>, isError?: boolean }
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toMatch(/conflict \(409\)/)
    expect(result.content[0]!.text).toContain('"impactToken": "fresh"')
    expect(result.content[0]!.text).not.toContain('ezswm_secret')

    await client.close()
    await server.close()
  })
})

describe('MCP server over in-memory transport', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('registers the read tools and returns tool output for a real call', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json([{ id: 's1', name: 'HQ' }])))
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = createEzswmMcpServer(
      new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_t' }),
      { name: 'ezswm-mcp-test', version: '0.0.0-test' }
    )
    const client = new Client({ name: 'test-client', version: '0.0.0-test' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const { tools } = await client.listTools()
    expect(tools.map(t => t.name)).toContain('list_sites')

    const result = await client.callTool({ name: 'list_sites', arguments: {} }) as { content: Array<{ type: string, text: string }>, isError?: boolean }
    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0]!.text)).toEqual([{ id: 's1', name: 'HQ' }])

    await client.close()
    await server.close()
  })

  it('surfaces API errors as readable tool errors without leaking the token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Forbidden' }, 403)))
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = createEzswmMcpServer(
      new EzswmClient({ baseUrl: 'https://ezswm.example.com', token: 'ezswm_secret' }),
      { name: 'ezswm-mcp-test', version: '0.0.0-test' }
    )
    const client = new Client({ name: 'test-client', version: '0.0.0-test' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const result = await client.callTool({ name: 'list_sites', arguments: {} }) as { content: Array<{ text: string }>, isError?: boolean }
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toMatch(/not allowed/)
    expect(result.content[0]!.text).not.toContain('ezswm_secret')

    await client.close()
    await server.close()
  })
})
