/** Thin HTTP client for the ezSWM REST API. All business logic stays in the app. */
export interface ClientOptions {
  baseUrl: string
  token: string
  timeoutMs?: number
}

export type QueryValue = string | number | boolean | undefined

/** A mapped API error with a readable, credential-free message. */
export class EzswmApiError extends Error {
  readonly status: number
  readonly data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'EzswmApiError'
    this.status = status
    this.data = data
  }
}

export class EzswmClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly timeoutMs: number

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.token = options.token
    this.timeoutMs = options.timeoutMs ?? 15_000
  }

  async get(path: string, query: Record<string, QueryValue> = {}): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json'
        },
        // Do not forward the upstream credential to a redirect target.
        redirect: 'error',
        signal: AbortSignal.timeout(this.timeoutMs)
      })
    } catch (err) {
      throw mapNetworkError(err)
    }

    return parseResponse(response)
  }
}

function mapNetworkError(err: unknown): EzswmApiError {
  const name = (err as { name?: string })?.name
  if (name === 'TimeoutError' || name === 'AbortError') {
    return new EzswmApiError(0, 'ezSWM request timed out')
  }
  return new EzswmApiError(0, `Cannot reach ezSWM: ${(err as Error)?.message ?? 'network error'}`)
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  let body: unknown = undefined
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = undefined
    }
  }

  if (response.ok) {
    if (!text) return null
    if (body === undefined) throw new EzswmApiError(response.status, 'ezSWM returned a non-JSON response')
    return body
  }

  const data = body as { message?: unknown, statusMessage?: unknown, data?: unknown } | undefined
  const detail = data?.data !== undefined ? data.data : undefined
  const apiMessage = typeof data?.message === 'string'
    ? data.message
    : typeof data?.statusMessage === 'string'
      ? data.statusMessage
      : undefined

  throw new EzswmApiError(response.status, mapStatusMessage(response.status, apiMessage), detail)
}

function mapStatusMessage(status: number, apiMessage?: string): string {
  const base = {
    400: 'ezSWM rejected the request (400)',
    401: 'ezSWM rejected the API token (401). Regenerate the token and update EZSWM_TOKEN.',
    403: 'The API token is not allowed to perform this operation (403).',
    404: 'Not found in ezSWM (404).',
    409: 'ezSWM reported a conflict (409). Re-read the current state and retry.',
    429: 'ezSWM is rate limiting requests (429). Retry later.',
    500: 'ezSWM reported an internal error (500).',
    502: 'ezSWM is unreachable through its proxy (502).',
    503: 'ezSWM is temporarily unavailable (503).'
  }[status]
  if (base) return apiMessage ? `${base}: ${apiMessage}` : base
  return apiMessage ? `ezSWM request failed (${status}): ${apiMessage}` : `ezSWM request failed (${status}).`
}
