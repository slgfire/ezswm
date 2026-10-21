import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

import { EzswmApiError, EzswmClient } from '../src/client.js'
import { ConfigError, loadConfig } from '../src/config.js'
import { READ_TOOLS } from '../src/tools.js'
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
      'list_networks', 'get_network', 'list_ip_allocations', 'list_ip_ranges', 'list_lags',
      'list_device_types', 'get_settings', 'subnet_info', 'search', 'export_documentation_data'
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
