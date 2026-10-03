import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Encryption of the OIDC client secret at rest.
 *
 * Key: `OIDC_ENCRYPTION_KEY` (runtimeConfig.oidcEncryptionKey) – exactly 32 bytes,
 * canonical format = standard base64 (44 chars, `openssl rand -base64 32`);
 * 64-char hex is also accepted. It must differ from JWT_SECRET and there is NO
 * fallback to JWT_SECRET. A missing/invalid key only disables OIDC features.
 *
 * Payload (string): `v1.<iv b64url>.<tag b64url>.<ciphertext b64url>` – AES-256-GCM,
 * 12-byte random IV, 16-byte tag, AAD = "ezswm:oidc:client-secret:v1".
 */

export type OidcCryptoErrorCode =
  | 'key_missing'
  | 'key_invalid'
  | 'key_equals_jwt_secret'
  | 'payload_invalid'
  | 'decrypt_failed'

export class OidcCryptoError extends Error {
  code: OidcCryptoErrorCode
  constructor(code: OidcCryptoErrorCode) {
    super(code)
    this.name = 'OidcCryptoError'
    this.code = code
  }
}

const AAD = Buffer.from('ezswm:oidc:client-secret:v1', 'utf8')
const KEY_BYTES = 32
const IV_BYTES = 12
const TAG_BYTES = 16
const HEX_RE = /^[0-9a-fA-F]{64}$/
const B64_RE = /^[A-Za-z0-9+/]{43}=$/

export function parseOidcEncryptionKey(raw: string | undefined | null, jwtSecret?: string | null): Buffer {
  const value = (raw ?? '').trim()
  if (!value) throw new OidcCryptoError('key_missing')
  const jwt = (jwtSecret ?? '').trim()
  // Plain (non-encoding) string equality guard.
  if (jwt && value === jwt) throw new OidcCryptoError('key_equals_jwt_secret')

  const key = decodeKey32(value)
  if (!key) throw new OidcCryptoError('key_invalid')

  // If JWT_SECRET is itself a canonical 32-byte key (hex64 or strict base64), reject the
  // same underlying bytes even when encoded differently (hex vs base64).
  const jwtKey = jwt ? decodeKey32(jwt) : null
  if (jwtKey && timingSafeEqual(jwtKey, key)) throw new OidcCryptoError('key_equals_jwt_secret')
  return key
}

/** Decode a canonical 32-byte key (hex64 or strict base64 with padding); null otherwise. */
function decodeKey32(value: string): Buffer | null {
  let key: Buffer | null = null
  if (HEX_RE.test(value)) {
    key = Buffer.from(value, 'hex')
  } else if (B64_RE.test(value)) {
    key = Buffer.from(value, 'base64')
  }
  return key && key.length === KEY_BYTES ? key : null
}

export interface OidcKeyState {
  ready: boolean
  key?: Buffer
  error?: OidcCryptoErrorCode
}

export function getOidcKeyState(raw: string | undefined | null, jwtSecret?: string | null): OidcKeyState {
  try {
    return { ready: true, key: parseOidcEncryptionKey(raw, jwtSecret) }
  } catch (err) {
    return { ready: false, error: err instanceof OidcCryptoError ? err.code : 'key_invalid' }
  }
}

export function encryptOidcSecret(plaintext: string, key: Buffer): string {
  if (key.length !== KEY_BYTES) throw new OidcCryptoError('key_invalid')
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES })
  cipher.setAAD(AAD)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.')
}

export function decryptOidcSecret(payload: string, key: Buffer): string {
  if (key.length !== KEY_BYTES) throw new OidcCryptoError('key_invalid')
  const parts = payload.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') throw new OidcCryptoError('payload_invalid')
  const iv = Buffer.from(parts[1]!, 'base64url')
  const tag = Buffer.from(parts[2]!, 'base64url')
  const ct = Buffer.from(parts[3]!, 'base64url')
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new OidcCryptoError('payload_invalid')
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES })
    decipher.setAAD(AAD)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
  } catch {
    throw new OidcCryptoError('decrypt_failed')
  }
}

/** True when the payload can be decrypted with the given key (never throws). */
export function canDecryptOidcSecret(payload: string | null, key: Buffer | undefined): boolean {
  if (!payload) return false
  if (!key) return false
  try {
    decryptOidcSecret(payload, key)
    return true
  } catch {
    return false
  }
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}
