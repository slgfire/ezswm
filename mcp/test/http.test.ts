import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

import { EzswmClient } from '../src/client.js'
import { ConfigError, loadConfig } from '../src/config.js'
import { startHttpServer } from '../src/http.js'

const UPSTREAM_TOKEN = 'ezswm_' + 'u'.repeat(32)
const CLIENT_TOKEN = 'ezswm_' + 'c'.repeat(32)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const httpEnv = (over: Record<string, string | undefined> = {}) => ({
  EZSWM_URL: 'https://ezswm.example.com',
  EZSWM_TOKEN: UPSTREAM_TOKEN,
  EZSWM_MCP_AUTH_TOKEN: CLIENT_TOKEN,
  PORT: '18080',
  ...over
})

const initBody = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '1' }
  }
})

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as AddressInfo
      probe.close(() => resolve(port))
    })
  })
}

async function startTestServer(over: Record<string, string | undefined> = {}) {
  const port = await freePort()
  const config = await loadConfig(httpEnv({ PORT: String(port), ...over }))
  const handle = await startHttpServer(
    new EzswmClient(config),
    { name: 'ezswm-mcp-test', version: '0.0.0-test' },
    config.http!,
    () => undefined
  )
  return { url: `http://127.0.0.1:${handle.port}/mcp`, close: handle.close }
}

const post = (url: string, headers: Record<string, string>) =>
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: initBody
  })

/** fetch() cannot set Host, so raw requests are used for Host validation. */
const rawPost = (url: string, headers: Record<string, string>) =>
  new Promise<number>((resolve, reject) => {
    const target = new URL(url)
    const req = request({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(initBody), ...headers }
    }, (res) => {
      res.resume()
      resolve(res.statusCode ?? 0)
    })
    req.on('error', reject)
    req.end(initBody)
  })

describe('HTTP configuration', () => {
  it('stays in stdio mode when PORT is unset', async () => {
    expect((await loadConfig(httpEnv({ PORT: undefined, EZSWM_MCP_AUTH_TOKEN: undefined }))).http).toBeUndefined()
  })

  it('defaults to loopback and derives the allowed hosts from the port', async () => {
    const config = await loadConfig(httpEnv({ PORT: '19000' }))
    expect(config.http).toMatchObject({ host: '127.0.0.1', port: 19000 })
    expect(config.http!.allowedHosts).toContain('127.0.0.1:19000')
    expect(config.http!.allowedHosts).toContain('localhost:19000')
  })

  it('refuses HTTP mode without a client token', async () => {
    await expect(loadConfig(httpEnv({ EZSWM_MCP_AUTH_TOKEN: undefined }))).rejects.toThrow(ConfigError)
    await expect(loadConfig(httpEnv({ EZSWM_MCP_AUTH_TOKEN: undefined }))).rejects.toThrow(/no unauthenticated mode/)
  })

  it('rejects a client token that looks malformed or equals the upstream token', async () => {
    await expect(loadConfig(httpEnv({ EZSWM_MCP_AUTH_TOKEN: 'nope' }))).rejects.toThrow(/ezswm_ prefix/)
    await expect(loadConfig(httpEnv({ EZSWM_MCP_AUTH_TOKEN: UPSTREAM_TOKEN }))).rejects.toThrow(/must differ/)
  })

  it('refuses a non-loopback bind without explicit opt-in, Host and Origin allowlists', async () => {
    await expect(loadConfig(httpEnv({ HOST: '0.0.0.0' }))).rejects.toThrow(/EZSWM_HTTP_ALLOW_REMOTE_BIND=true/)
    await expect(loadConfig(httpEnv({
      HOST: '0.0.0.0',
      EZSWM_HTTP_ALLOW_REMOTE_BIND: 'true'
    }))).rejects.toThrow(/EZSWM_HTTP_ALLOWED_HOSTS is required/)
    await expect(loadConfig(httpEnv({
      HOST: '0.0.0.0',
      EZSWM_HTTP_ALLOW_REMOTE_BIND: 'true',
      EZSWM_HTTP_ALLOWED_HOSTS: 'mcp.example.com'
    }))).rejects.toThrow(/EZSWM_HTTP_ALLOWED_ORIGINS is required/)
  })
})

describe('HTTP transport', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects requests without a Bearer token', async () => {
    const server = await startTestServer()
    try {
      const response = await post(server.url, {})
      expect(response.status).toBe(401)
      expect(JSON.stringify(await response.json())).not.toContain(CLIENT_TOKEN)
    } finally {
      await server.close()
    }
  })

  it('rejects a wrong Bearer token and leaves GET unauthenticated too', async () => {
    const server = await startTestServer()
    try {
      expect((await post(server.url, { authorization: 'Bearer ezswm_wrong' })).status).toBe(401)
      expect((await fetch(server.url)).status).toBe(401)
    } finally {
      await server.close()
    }
  })

  it('validates Host and Origin before serving tools', async () => {
    const server = await startTestServer({ EZSWM_HTTP_ALLOWED_ORIGINS: 'https://chat.example.com' })
    const auth = { authorization: `Bearer ${CLIENT_TOKEN}` }
    try {
      expect(await rawPost(server.url, { ...auth, host: 'evil.example' })).toBe(403)
      expect((await post(server.url, { ...auth, origin: 'https://evil.example' })).status).toBe(403)
      expect((await post(server.url, { ...auth, origin: 'https://chat.example.com' })).status).toBe(200)
      expect((await post(server.url, { ...auth, 'user-agent': 'cli' })).status).toBe(200)
      expect((await fetch(server.url.replace('/mcp', '/other'), { headers: auth })).status).toBe(404)
    } finally {
      await server.close()
    }
  })

  it('serves a real MCP client over authenticated Streamable HTTP', async () => {
    // The upstream ezSWM API is stubbed; the MCP client transport uses real fetch.
    const realFetch = fetch
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      if (url.hostname === 'ezswm.example.com') return json([{ id: 's1', name: 'HQ' }])
      return realFetch(input as RequestInfo, init)
    }))

    const server = await startTestServer()
    const transport = new StreamableHTTPClientTransport(new URL(server.url), {
      requestInit: { headers: { authorization: `Bearer ${CLIENT_TOKEN}` } }
    })
    const client = new Client({ name: 'http-test-client', version: '0.0.0-test' })
    try {
      await client.connect(transport)
      const { tools } = await client.listTools()
      expect(tools.map(tool => tool.name)).toContain('list_sites')
      const result = await client.callTool({ name: 'list_sites', arguments: {} }) as {
        content: Array<{ text: string }>
        isError?: boolean
      }
      expect(result.isError).toBeUndefined()
      expect(JSON.parse(result.content[0]!.text)).toEqual([{ id: 's1', name: 'HQ' }])
    } finally {
      await client.close().catch(() => undefined)
      await server.close()
    }
  })
})
