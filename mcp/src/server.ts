import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { EzswmClient } from './client.js'
import { EzswmApiError } from './client.js'
import { READ_TOOLS } from './tools.js'

export interface ServerInfo {
  name: string
  version: string
}

/** Registers the plan's read tools on a stdio/HTTP-agnostic McpServer. */
export function createEzswmMcpServer(client: EzswmClient, info: ServerInfo): McpServer {
  const server = new McpServer(info)

  for (const tool of READ_TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.schema.shape },
      async (args: Record<string, unknown>) => {
        try {
          const parsed = tool.schema.parse(args ?? {})
          const result = await tool.handler(client, parsed as Record<string, unknown>)
          return { content: [{ type: 'text' as const, text: toText(result) }] }
        } catch (err) {
          return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true }
        }
      }
    )
  }

  return server
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function errorText(err: unknown): string {
  if (err instanceof EzswmApiError) {
    return err.data === undefined ? err.message : `${err.message}\n${JSON.stringify(err.data, null, 2)}`
  }
  if (err instanceof Error) return err.message
  return 'Unknown error'
}
