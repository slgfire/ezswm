import { createHash, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import type { EzswmClient } from './client.js'
import type { HttpConfig } from './config.js'
import { createEzswmMcpServer, type ServerInfo } from './server.js'

export const MCP_PATH = '/mcp'

export interface HttpServerHandle {
  host: string
  port: number
  close: () => Promise<void>
}

/**
 * Streamable HTTP transport in stateless mode. Clients authenticate with an
 * ezSWM API token (Bearer); the upstream token stays server-side and is never
 * accepted from or disclosed to clients.
 */
export async function startHttpServer(
  client: EzswmClient,
  info: ServerInfo,
  config: HttpConfig,
  log: (message: string) => void
): Promise<HttpServerHandle> {
  const active = new Set<{ server: McpServer, transport: StreamableHTTPServerTransport }>()

  const httpServer = createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' })
      else res.end()
    })
  })

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // DNS-rebinding protection: validate Host/Origin before anything else.
    const host = req.headers.host?.toLowerCase()
    if (!host || !config.allowedHosts.some(allowed => allowed.toLowerCase() === host)) {
      sendJson(res, 403, { error: 'Host not allowed' })
      return
    }
    const origin = req.headers.origin
    if (origin !== undefined && !config.allowedOrigins.includes(normalizeOrigin(origin))) {
      sendJson(res, 403, { error: 'Origin not allowed' })
      return
    }
    if (req.url?.split('?')[0] !== MCP_PATH) {
      sendJson(res, 404, { error: 'Not found' })
      return
    }
    if (!isAuthorized(req.headers.authorization, config.authTokens)) {
      // Generic message: never echo the credential or reveal which token was given.
      sendJson(res, 401, { error: 'Unauthorized' })
      return
    }

    const server = createEzswmMcpServer(client, info)
    const transport = new StreamableHTTPServerTransport({
      // Omitting sessionIdGenerator selects stateless mode.
      enableJsonResponse: true
    })
    const entry = { server, transport }
    active.add(entry)
    res.on('close', () => {
      active.delete(entry)
      void transport.close().catch(() => undefined)
      void server.close().catch(() => undefined)
    })

    // The SDK transport declares callbacks as optional; its Transport type does
    // not accept that under exactOptionalPropertyTypes.
    await server.connect(transport as unknown as Parameters<McpServer['connect']>[0])
    await transport.handleRequest(req, res)
  }

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(config.port, config.host, () => {
      httpServer.off('error', reject)
      resolve()
    })
  })

  const address = httpServer.address()
  const port = typeof address === 'object' && address ? address.port : config.port
  log(`listening on http://${config.host}:${port}${MCP_PATH} (Bearer token required)`)

  return {
    host: config.host,
    port,
    close: async () => {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()))
      for (const entry of [...active]) {
        active.delete(entry)
        await entry.transport.close().catch(() => undefined)
        await entry.server.close().catch(() => undefined)
      }
    }
  }
}

function isAuthorized(header: string | undefined, accepted: string[]): boolean {
  const match = /^Bearer\s+(.+)$/i.exec(header?.trim() ?? '')
  if (!match?.[1]) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  const presented = digest(match[1])
  let authorized = false
  for (const token of accepted) {
    // Constant-time comparison; every candidate is checked to avoid length leaks.
    if (timingSafeEqual(presented, digest(token))) authorized = true
  }
  return authorized
}

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin
  } catch {
    return value
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}
