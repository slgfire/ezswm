#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EzswmClient } from './client.js'
import { ConfigError, loadConfig } from './config.js'
import { startHttpServer } from './http.js'
import { createEzswmMcpServer } from './server.js'
import { readVersion } from './version.js'

// stdout is reserved for the MCP protocol; all diagnostics go to stderr.
const log = (message: string) => process.stderr.write(`[ezswm-mcp] ${message}\n`)

async function main(): Promise<void> {
  let config
  try {
    config = await loadConfig()
  } catch (err) {
    log(err instanceof ConfigError ? err.message : 'Invalid configuration')
    process.exitCode = 1
    return
  }

  const client = new EzswmClient(config)
  const info = {
    name: 'ezswm-mcp',
    version: readVersion(dirname(fileURLToPath(import.meta.url)))
  }

  if (config.http) {
    const httpServer = await startHttpServer(client, info, config.http, log)
    let stopping = false
    const shutdown = async () => {
      if (stopping) return
      stopping = true
      log('shutting down')
      // Force exit if a client keeps a connection open past the grace period.
      setTimeout(() => process.exit(0), 5_000).unref()
      await httpServer.close().catch(() => undefined)
      process.exit(0)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    return
  }

  const server = createEzswmMcpServer(client, info)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  log(`connected via stdio to ${new URL(config.baseUrl).host}`)

  const shutdown = async () => {
    log('shutting down')
    await server.close().catch(() => undefined)
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  log(err instanceof Error ? err.message : 'Fatal startup error')
  process.exit(1)
})
