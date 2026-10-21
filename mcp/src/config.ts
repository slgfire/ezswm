/**
 * Startup configuration. The upstream ezSWM credential comes only from the
 * server-side environment and is never accepted from or disclosed to MCP clients.
 */
export interface McpConfig {
  baseUrl: string
  token: string
  timeoutMs: number
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

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

  return { baseUrl: url.toString().replace(/\/$/, ''), token, timeoutMs }
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
