import type { H3Event } from 'h3'

const WINDOW_MS = 60_000
const GLOBAL_LIMIT = 120
const ACCOUNT_LIMIT = 10

interface AttemptWindow {
  expiresAt: number
  count: number
  accounts: Map<string, number>
}

let activeWindow: AttemptWindow | undefined

/** Count unsuccessful or in-flight password checks within a bounded process-wide window. */
export function reservePasswordAttempt(event: H3Event, username: string): () => void {
  const now = Date.now()
  if (!activeWindow || now >= activeWindow.expiresAt) {
    activeWindow = { expiresAt: now + WINDOW_MS, count: 0, accounts: new Map() }
  }
  const current = activeWindow
  const key = username.toLowerCase().slice(0, 100)
  const attempts = current.accounts.get(key) ?? 0
  if (current.count >= GLOBAL_LIMIT || attempts >= ACCOUNT_LIMIT) {
    setHeader(event, 'Retry-After', Math.max(1, Math.ceil((current.expiresAt - now) / 1000)))
    throw createError({ statusCode: 429, statusMessage: 'Too many login attempts' })
  }

  current.count++
  current.accounts.set(key, attempts + 1)
  return () => {
    current.count--
    const remaining = (current.accounts.get(key) ?? 1) - 1
    if (remaining === 0) current.accounts.delete(key)
    else current.accounts.set(key, remaining)
  }
}
