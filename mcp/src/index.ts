#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { EzswmClient } from './client.js'
import { ConfigError, loadConfig } from './config.js'
import { createEzswmMcpServer } from './server.js'

// stdout is reserved for the MCP protocol; all diagnostics go to stderr.
const log = (message: string) => process.stderr.write(`[ezswm-mcp] ${message}\n`)

async function main(): Promise<void> {
  if (process.env.PORT) {
    // Hosted Streamable HTTP (with its separate client authentication and
    // Origin/Host contract) is a later Stage-3 slice; refuse rather than
    // silently serving stdio when the operator asked for HTTP.
    log('PORT is set but the Streamable HTTP transport is not included in this build yet. Unset PORT to use stdio.')
    process.exitCode = 2
    return
  }

  let config
  try {
    config = await loadConfig()
  } catch (err) {
    log(err instanceof ConfigError ? err.message : 'Invalid configuration')
    process.exitCode = 1
    return
  }

  const client = new EzswmClient(config)
  const server = createEzswmMcpServer(client, {
    name: 'ezswm-mcp',
    version: process.env.npm_package_version ?? '0.0.0-dev'
  })

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
