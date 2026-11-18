import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import type { OidcSessionClaims } from '../../types/oidc'
import { loginSchema } from '../validators/userSchemas'

// Match the bcrypt variants accepted by compare(), including canonical base64 padding.
const PASSWORD_HASH_RE = /^\$2[aby]\$(?:0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{21}[.Oeu][./A-Za-z0-9]{30}[.CGKOSWaeimquy26]$/

export function hasLocalLoginCredentials(username: unknown, passwordHash: unknown): boolean {
  return loginSchema.shape.username.safeParse(username).success &&
    typeof passwordHash === 'string' && passwordHash.length === 60 && PASSWORD_HASH_RE.test(passwordHash)
}

const JWT_SECRET_MIN_BYTES = 32
const JWT_SECRET_PLACEHOLDERS = new Set([
  'change-me-to-a-random-secret-in-production',
  'change-me-to-a-long-random-secret'
])

export function hasJwtSigningKey(secret: string): boolean {
  return Buffer.byteLength(secret.trim(), 'utf8') >= JWT_SECRET_MIN_BYTES &&
    !JWT_SECRET_PLACEHOLDERS.has(secret.trim())
}

function getJwtSigningKey(): string {
  const secret = useRuntimeConfig().jwtSecret
  if (process.env.NODE_ENV === 'production' && !hasJwtSigningKey(secret)) {
    throw new Error('Set NUXT_JWT_SECRET to a random value of at least 32 bytes')
  }
  return secret
}

export interface JwtPayload {
  sub: string
  username: string
  /** Informational only: the authoritative role is always read from the DB per request. */
  role: string
}

/** Optional OIDC session claims (`ap`/`osv`/`orev`); absent for local password logins. */
export type SignTokenPayload = JwtPayload & Partial<OidcSessionClaims>

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: SignTokenPayload, rememberMe: boolean = false): string {
  const expiresIn = rememberMe ? '30d' : '7d'
  return jwt.sign(payload, getJwtSigningKey(), { expiresIn, algorithm: 'HS256' })
}

export function verifyToken(token: string): SignTokenPayload & { iat: number, exp: number } {
  return jwt.verify(token, getJwtSigningKey(), { algorithms: ['HS256'] }) as SignTokenPayload & { iat: number, exp: number }
}

export type RequestCredential =
  | { kind: 'none' }
  /** An Authorization header was sent but is not a usable Bearer credential. */
  | { kind: 'invalid' }
  | { kind: 'header' | 'cookie', token: string }

/**
 * Credential with provenance. An explicit Authorization header NEVER falls back to the
 * cookie: a malformed/non-Bearer header is `invalid` even when a valid cookie exists.
 */
export function getCredentialFromEvent(event: H3Event): RequestCredential {
  const authHeader = getHeader(event, 'authorization')
  if (authHeader !== undefined) {
    const m = /^Bearer ([^\s]+)$/i.exec(authHeader)
    return m ? { kind: 'header', token: m[1]! } : { kind: 'invalid' }
  }
  const cookie = getCookie(event, 'ezswm_token')
  return cookie ? { kind: 'cookie', token: cookie } : { kind: 'none' }
}

export function setAuthCookie(event: H3Event, token: string, rememberMe: boolean = false, secure?: boolean): void {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60
  setCookie(event, 'ezswm_token', token, {
    httpOnly: true,
    secure: secure ?? getRequestURL(event).protocol === 'https:',
    sameSite: 'lax',
    maxAge,
    path: '/'
  })
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, 'ezswm_token', { path: '/' })
}

/**
 * Request origin WITHOUT trusting X-Forwarded-* headers (h3 defaults). Used as the
 * fallback for the canonical OIDC callback URL when PUBLIC_BASE_URL is not set.
 */
export function getRequestOrigin(event: H3Event): string {
  // h3 1.x trusts X-Forwarded-Proto by default; pin it off (X-Forwarded-Host is already off
  // by default). Behind a TLS proxy set PUBLIC_BASE_URL for the canonical https origin.
  return getRequestURL(event, { xForwardedProto: false, xForwardedHost: false }).origin
}
