export type ApiTokenExpiryError = 'invalid' | 'past' | 'too_far'

export type ApiTokenExpiryResult =
  | { expiresAt: string | undefined, error?: never }
  | { expiresAt?: never, error: ApiTokenExpiryError }

/** Convert a local datetime-local value to an ISO UTC timestamp after enforcing the API limit. */
export function parseApiTokenExpiry(value: string, now = new Date()): ApiTokenExpiryResult {
  if (!value) return { expiresAt: undefined }

  const expiry = new Date(value)
  if (!Number.isFinite(expiry.getTime())) return { error: 'invalid' }
  if (expiry.getTime() <= now.getTime()) return { error: 'past' }

  const latest = new Date(now)
  latest.setUTCFullYear(latest.getUTCFullYear() + 5)
  if (expiry.getTime() > latest.getTime()) return { error: 'too_far' }

  return { expiresAt: expiry.toISOString() }
}
