import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import type { OidcSessionClaims } from '../../types/oidc'

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
  const config = useRuntimeConfig()
  const expiresIn = rememberMe ? '30d' : '7d'
  return jwt.sign(payload, config.jwtSecret, { expiresIn, algorithm: 'HS256' })
}

export function verifyToken(token: string): SignTokenPayload & { iat: number, exp: number } {
  const config = useRuntimeConfig()
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as SignTokenPayload & { iat: number, exp: number }
}

export function getTokenFromEvent(event: H3Event): string | null {
  // Check Authorization header
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Check cookie
  const token = getCookie(event, 'ezswm_token')
  return token || null
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
