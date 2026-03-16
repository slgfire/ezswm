import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

interface JwtPayload {
  sub: string
  username: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: JwtPayload, rememberMe: boolean = false): string {
  const config = useRuntimeConfig()
  const expiresIn = rememberMe ? '30d' : '7d'
  return jwt.sign(payload, config.jwtSecret, { expiresIn })
}

export function verifyToken(token: string): JwtPayload & { iat: number, exp: number } {
  const config = useRuntimeConfig()
  return jwt.verify(token, config.jwtSecret) as JwtPayload & { iat: number, exp: number }
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

export function setAuthCookie(event: H3Event, token: string, rememberMe: boolean = false): void {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60
  setCookie(event, 'ezswm_token', token, {
    httpOnly: true,
    secure: getRequestURL(event).protocol === 'https:',
    sameSite: 'lax',
    maxAge,
    path: '/'
  })
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, 'ezswm_token', { path: '/' })
}
