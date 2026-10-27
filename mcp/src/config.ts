/**
 * Startup configuration. The upstream ezSWM credential comes only from the
 * server-side environment and is never accepted from or disclosed to MCP clients.
 */
export interface HttpConfig {
  host: string
  port: number
  /** Accepted client Bearer tokens; never logged, never sent upstream. */
  authTokens: string[]
  allowedOrigins: string[]
  allowedHosts: string[]
}

export interface McpConfig {
  baseUrl: string
  token: string
  timeoutMs: number
  /** Present only when PORT is set; otherwise the stdio transport is used. */
  http?: HttpConfig
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const DEFAULT_HTTP_HOST = '127.0.0.1'

export class ConfigError extends Error {}

export async function loadConfig(env: NodeJS.ProcessEnv = process.env): Promise<McpConfig> {
  const rawUrl = env.EZSWM_URL?.trim()
  if (!rawUrl) throw new ConfigError('EZSWM_URL is required (for example https://ezswm.example.com)')

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new ConfigError('EZSWM_URL is not a valid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConfigError('EZSWM_URL must use http:// or https://')
  }
  if (url.username || url.password) {
    throw new ConfigError('EZSWM_URL must not contain credentials')
  }
  // HTTPS is expected; plain HTTP is limited to loopback or an explicit opt-in
  // for a trusted LAN host (documented exception).
  if (url.protocol === 'http:' && !LOOPBACK_HOSTS.has(url.hostname) && env.EZSWM_ALLOW_INSECURE_HTTP !== 'true') {
    throw new ConfigError('EZSWM_URL must use HTTPS (set EZSWM_ALLOW_INSECURE_HTTP=true only for a trusted LAN host)')
  }

  const fileToken = env.EZSWM_TOKEN_FILE ? (await readTokenFile(env.EZSWM_TOKEN_FILE)).trim() : undefined
  const token = (env.EZSWM_TOKEN?.trim() || fileToken || '').trim()
  if (!token) throw new ConfigError('EZSWM_TOKEN or EZSWM_TOKEN_FILE is required')
  if (!token.startsWith('ezswm_')) {
    throw new ConfigError('The configured credential does not look like an ezSWM API token (expected the ezswm_ prefix)')
  }

  const timeoutMs = Number(env.EZSWM_TIMEOUT_MS ?? 15_000)
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ConfigError('EZSWM_TIMEOUT_MS must be a positive number of milliseconds')
  }

  const http = env.PORT ? await loadHttpConfig(env, token) : undefined

  return { baseUrl: url.toString().replace(/\/$/, ''), token, timeoutMs, ...(http ? { http } : {}) }
}

/**
 * HTTP mode is opt-in: it exists only when PORT is set. There is no
 * unauthenticated mode, so the accepted client token is required as well.
 */
async function loadHttpConfig(env: NodeJS.ProcessEnv, upstreamToken: string): Promise<HttpConfig> {
  const port = Number(env.PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError('PORT must be an integer between 1 and 65535')
  }

  const host = env.HOST?.trim() || DEFAULT_HTTP_HOST
  const loopback = LOOPBACK_HOSTS.has(host)
  if (!loopback && env.EZSWM_HTTP_ALLOW_REMOTE_BIND !== 'true') {
    throw new ConfigError(
      `Refusing to bind the MCP HTTP endpoint to non-loopback host "${host}". ` +
      'Set EZSWM_HTTP_ALLOW_REMOTE_BIND=true and terminate TLS in front of it.'
    )
  }

  const fileToken = env.EZSWM_MCP_AUTH_TOKEN_FILE ? (await readTokenFile(env.EZSWM_MCP_AUTH_TOKEN_FILE)).trim() : undefined
  const authTokens = splitList(env.EZSWM_MCP_AUTH_TOKEN ?? fileToken)
  if (authTokens.length === 0) {
    throw new ConfigError('EZSWM_MCP_AUTH_TOKEN or EZSWM_MCP_AUTH_TOKEN_FILE is required in HTTP mode (no unauthenticated mode)')
  }
  for (const candidate of authTokens) {
    if (!candidate.startsWith('ezswm_')) {
      throw new ConfigError('The client credential does not look like an ezSWM API token (expected the ezswm_ prefix)')
    }
    if (candidate === upstreamToken) {
      // Clients must never receive the upstream credential, even by accident.
      throw new ConfigError('EZSWM_MCP_AUTH_TOKEN must differ from EZSWM_TOKEN')
    }
  }

  const allowedOrigins = splitList(env.EZSWM_HTTP_ALLOWED_ORIGINS).map((value) => {
    try {
      const origin = new URL(value).origin
      return origin
    } catch {
      throw new ConfigError(`EZSWM_HTTP_ALLOWED_ORIGINS contains an invalid origin: "${value}"`)
    }
  })

  let allowedHosts = splitList(env.EZSWM_HTTP_ALLOWED_HOSTS)
  if (allowedHosts.length === 0) {
    // A wildcard or concrete non-loopback address cannot be validated against
    // the Host header, so the operator has to name the accepted hosts.
    if (!loopback) {
      throw new ConfigError('EZSWM_HTTP_ALLOWED_HOSTS is required when binding to a non-loopback host')
    }
    allowedHosts = [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]
  }
  if (!loopback && allowedOrigins.length === 0) {
    throw new ConfigError('EZSWM_HTTP_ALLOWED_ORIGINS is required when binding to a non-loopback host')
  }

  return { host, port, authTokens, allowedOrigins, allowedHosts }
}

function splitList(value: string | undefined): string[] {
  return (value ?? '').split(',').map(item => item.trim()).filter(Boolean)
}

async function readTokenFile(path: string): Promise<string> {
  const { readFile } = await import('node:fs/promises')
  try {
    return await readFile(path, 'utf8')
  } catch {
    // Never include the token or file contents in the error.
    throw new ConfigError(`Cannot read EZSWM_TOKEN_FILE at "${path}"`)
  }
}
