import * as oidc from 'openid-client'
import type { OidcCheckResultDto, OidcConfigRecord, OidcErrorCode } from '../../../types/oidc'
import { sha256Hex } from './crypto'

/**
 * openid-client v6.8.8 wrapper.
 *
 * Security invariants (do not relax):
 *  - `enableNonRepudiationChecks(config)` is ALWAYS applied (real JWKS signature
 *    validation; `authorizationCodeGrant` does not do this by default).
 *  - Grants ALWAYS pass pkceCodeVerifier + expectedState + expectedNonce + idTokenExpected:true.
 *  - UserInfo is only fetched with expectedSubject = the validated ID token `sub`.
 *  - Client auth is chosen explicitly (Basic when advertised/absent, else Post, else fail);
 *    the library default (Post) is never relied upon.
 *  - HTTPS required unless `allow_http_issuer`; private/internal IdPs are supported.
 *  - Endpoints must come from the issuer-equal discovery document (may live on other hosts);
 *    redirects are never followed; timeouts and response-size caps apply.
 */

export const OIDC_CALLBACK_PATH = '/api/auth/oidc/callback'
export const OIDC_HTTP_TIMEOUT_SECONDS = 10
export const OIDC_LIMITS = {
  discovery: 512 * 1024,
  jwks: 256 * 1024,
  userinfo: 1024 * 1024,
  token: 512 * 1024
} as const
const CLIENT_CACHE_TTL_MS = 15 * 60 * 1000
const CLIENT_CACHE_MAX = 8

export type OidcClientErrorCode =
  | 'issuer_invalid'
  | 'issuer_mismatch'
  | 'endpoint_invalid'
  | 'redirect_not_allowed'
  | 'response_too_large'
  | 'unsupported_client_auth'
  | 'pkce_not_supported'
  | 'not_configured'
  | 'id_token_invalid'
  | 'unsupported_id_token_alg'

export class OidcClientError extends Error {
  code: OidcClientErrorCode
  constructor(code: OidcClientErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'OidcClientError'
    this.code = code
  }
}

// ---------------------------------------------------------------------------
// Callback URL
// ---------------------------------------------------------------------------

/** Validate PUBLIC_BASE_URL: absolute http(s) origin, no credentials/path/query/fragment. Returns origin or null. */
export function parsePublicBaseUrl(raw: string | undefined | null): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password || url.search || url.hash) return null
  if (value.includes('?') || value.includes('#')) return null
  if (url.pathname !== '/') return null
  return url.origin
}

/**
 * Canonical callback URL shared by UI/start/check/callback. Uses the validated
 * `publicBaseUrl` if set, else the request origin (caller passes h3's origin,
 * which does NOT trust X-Forwarded-* headers by default).
 */
export function resolveOidcCallbackUrl(publicBaseUrl: string | undefined | null, requestOrigin: string): string {
  const base = parsePublicBaseUrl(publicBaseUrl) ?? requestOrigin.replace(/\/+$/, '')
  return `${base}${OIDC_CALLBACK_PATH}`
}

// ---------------------------------------------------------------------------
// URL policy
// ---------------------------------------------------------------------------

/** Validate an absolute http(s) URL without credentials/fragment. HTTP only when allowed. */
export function validateOidcUrl(raw: unknown, allowHttp: boolean, code: OidcClientErrorCode = 'endpoint_invalid'): URL {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) throw new OidcClientError(code)
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new OidcClientError(code)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new OidcClientError(code)
  if (url.protocol === 'http:' && !allowHttp) throw new OidcClientError(code)
  if (url.username || url.password || url.hash || raw.includes('#')) throw new OidcClientError(code)
  return url
}

export function validateIssuerUrl(issuer: string, allowHttp: boolean): URL {
  const url = validateOidcUrl(issuer, allowHttp, 'issuer_invalid')
  if (url.search || issuer.includes('?')) throw new OidcClientError('issuer_invalid')
  return url
}

// ---------------------------------------------------------------------------
// Bounded fetch (manual redirects, response size caps)
// ---------------------------------------------------------------------------

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304])

async function readCapped(res: Response, cap: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > cap) throw new OidcClientError('response_too_large')
  if (!res.body) return new Uint8Array(0)
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > cap) {
      await reader.cancel().catch(() => undefined)
      throw new OidcClientError('response_too_large')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

function stripQuery(u: string): string {
  try {
    const url = new URL(u)
    return `${url.origin}${url.pathname}`
  } catch {
    return u
  }
}

export function createBoundedFetch(getEndpoints: () => { jwks?: string, userinfo?: string, token?: string }): oidc.CustomFetch {
  return async (url, options) => {
    const eps = getEndpoints()
    const target = stripQuery(url)
    const cap = target === eps.jwks
      ? OIDC_LIMITS.jwks
      : target === eps.userinfo
        ? OIDC_LIMITS.userinfo
        : target === eps.token
          ? OIDC_LIMITS.token
          : OIDC_LIMITS.discovery
    const res = await fetch(url, { ...options, redirect: 'manual' } as RequestInit)
    if (res.status >= 300 && res.status < 400) {
      throw new OidcClientError('redirect_not_allowed')
    }
    const body = await readCapped(res, cap)
    const headers = new Headers(res.headers)
    headers.delete('content-encoding')
    headers.delete('content-length')
    return new Response(NULL_BODY_STATUSES.has(res.status) ? null : (body as BodyInit), {
      status: res.status,
      statusText: res.statusText,
      headers
    })
  }
}

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

export type TokenAuthMethod = 'client_secret_basic' | 'client_secret_post' | 'none'

/** Explicit selection: Basic if advertised (or nothing advertised – spec default), else Post, else fail. */
export function selectTokenAuthMethod(advertised: readonly string[] | undefined, hasSecret: boolean): TokenAuthMethod {
  if (!hasSecret) return 'none'
  if (!advertised || advertised.length === 0) return 'client_secret_basic'
  if (advertised.includes('client_secret_basic')) return 'client_secret_basic'
  if (advertised.includes('client_secret_post')) return 'client_secret_post'
  throw new OidcClientError('unsupported_client_auth')
}

const ASYMMETRIC_ALGS = ['RS256', 'PS256', 'ES256', 'EdDSA', 'RS384', 'PS384', 'ES384', 'RS512', 'PS512', 'ES512']

/**
 * RS256 only when the provider does not advertise the field at all (missing-field compatibility). A present value must be a
 * non-empty array of non-empty strings containing at least one supported asymmetric alg (RS256 preferred); otherwise
 * unsupported_id_token_alg. Never HMAC or none; no trimming or case folding.
 */
export function selectIdTokenAlg(supported: unknown): string {
  if (supported === undefined) return 'RS256'
  if (!Array.isArray(supported) || supported.length === 0 || supported.some(a => typeof a !== 'string' || a.length === 0)) {
    throw new OidcClientError('unsupported_id_token_alg')
  }
  if (supported.includes('RS256')) return 'RS256'
  const pick = ASYMMETRIC_ALGS.find(a => supported.includes(a))
  if (!pick) throw new OidcClientError('unsupported_id_token_alg')
  return pick
}

export interface OidcClientSettings {
  issuer: string
  clientId: string
  clientSecret: string | null
  allowHttpIssuer: boolean
}

export interface OidcClientHandle {
  config: oidc.Configuration
  issuer: string
  authMethod: TokenAuthMethod
  idTokenAlg: string
  supportsS256: boolean
  warnings: string[]
  endpoints: { authorization: boolean, token: boolean, jwks: boolean, userinfo: boolean }
}

function assertEndpoints(meta: oidc.ServerMetadata, allowHttp: boolean): OidcClientHandle['endpoints'] {
  // Must be present and valid; they may live on hosts other than the issuer's.
  validateOidcUrl(meta.authorization_endpoint, allowHttp)
  validateOidcUrl(meta.token_endpoint, allowHttp)
  validateOidcUrl(meta.jwks_uri, allowHttp)
  const hasUserinfo = meta.userinfo_endpoint !== undefined
  if (hasUserinfo) validateOidcUrl(meta.userinfo_endpoint, allowHttp)
  return { authorization: true, token: true, jwks: true, userinfo: hasUserinfo }
}

/** Discover + build a fully hardened Configuration. Uncached. */
export async function buildOidcClient(settings: OidcClientSettings): Promise<OidcClientHandle> {
  const issuerUrl = validateIssuerUrl(settings.issuer, settings.allowHttpIssuer)

  let eps: { jwks?: string, userinfo?: string, token?: string } = {}
  const boundedFetch = createBoundedFetch(() => eps)

  // Step 1: metadata only. No secret is sent during discovery; client auth is chosen after.
  const execute: Array<(c: oidc.Configuration) => void> = settings.allowHttpIssuer ? [oidc.allowInsecureRequests] : []
  const discovered = await oidc.discovery(issuerUrl, settings.clientId, undefined, oidc.None(), {
    [oidc.customFetch]: boundedFetch,
    timeout: OIDC_HTTP_TIMEOUT_SECONDS,
    execute
  })
  const meta = discovered.serverMetadata()

  // Exact issuer equality (no normalization).
  if (meta.issuer !== settings.issuer) throw new OidcClientError('issuer_mismatch')
  const endpoints = assertEndpoints(meta, settings.allowHttpIssuer)
  eps = {
    jwks: stripQuery(meta.jwks_uri!),
    userinfo: meta.userinfo_endpoint ? stripQuery(meta.userinfo_endpoint) : undefined,
    token: stripQuery(meta.token_endpoint!)
  }

  const warnings: string[] = []
  const methods = meta.code_challenge_methods_supported
  if (methods && !methods.includes('S256')) throw new OidcClientError('pkce_not_supported')
  if (!methods) warnings.push('pkce_support_not_advertised')

  const authMethod = selectTokenAuthMethod(meta.token_endpoint_auth_methods_supported, settings.clientSecret !== null)
  const clientAuth = authMethod === 'client_secret_basic'
    ? oidc.ClientSecretBasic(settings.clientSecret!)
    : authMethod === 'client_secret_post'
      ? oidc.ClientSecretPost(settings.clientSecret!)
      : oidc.None()

  const idTokenAlg = selectIdTokenAlg(meta.id_token_signing_alg_values_supported)
  const config = new oidc.Configuration(
    meta,
    settings.clientId,
    {
      ...(settings.clientSecret !== null ? { client_secret: settings.clientSecret } : {}),
      id_token_signed_response_alg: idTokenAlg
    },
    clientAuth
  )
  config[oidc.customFetch] = boundedFetch
  config.timeout = OIDC_HTTP_TIMEOUT_SECONDS
  if (settings.allowHttpIssuer) oidc.allowInsecureRequests(config)
  // ALWAYS: enforce ID token signature validation against the issuer JWKS.
  oidc.enableNonRepudiationChecks(config)

  return { config, issuer: settings.issuer, authMethod, idTokenAlg, supportsS256: true, warnings, endpoints }
}

// ---------------------------------------------------------------------------
// Cache (issuer + revision + credentials + policy aware)
// ---------------------------------------------------------------------------

interface CacheEntry { handle: OidcClientHandle, expiresAt: number }
const clientCache = new Map<string, CacheEntry>()

export function oidcClientCacheKey(record: Pick<OidcConfigRecord, 'issuer' | 'client_id' | 'config_revision' | 'allow_http_issuer'>, clientSecret: string | null): string {
  return sha256Hex([
    record.issuer ?? '',
    record.client_id ?? '',
    String(record.config_revision),
    record.allow_http_issuer ? 'http' : 'https',
    clientSecret === null ? 'nosecret' : `secret:${sha256Hex(clientSecret)}`
  ].join('\u0000'))
}

export function clearOidcClientCache(): void {
  clientCache.clear()
}

export async function getOidcClient(record: OidcConfigRecord, clientSecret: string | null, now: number = Date.now()): Promise<OidcClientHandle> {
  if (!record.issuer || !record.client_id) throw new OidcClientError('not_configured')
  const key = oidcClientCacheKey(record, clientSecret)
  const hit = clientCache.get(key)
  if (hit && hit.expiresAt > now) return hit.handle

  const handle = await buildOidcClient({
    issuer: record.issuer,
    clientId: record.client_id,
    clientSecret,
    allowHttpIssuer: record.allow_http_issuer
  })
  if (clientCache.size >= CLIENT_CACHE_MAX) {
    const oldest = clientCache.keys().next().value
    if (oldest !== undefined) clientCache.delete(oldest)
  }
  clientCache.set(key, { handle, expiresAt: now + CLIENT_CACHE_TTL_MS })
  return handle
}

// ---------------------------------------------------------------------------
// Flow primitives
// ---------------------------------------------------------------------------

export interface AuthorizationRequestParts {
  state: string
  nonce: string
  codeVerifier: string
  url: URL
}

export async function createAuthorizationRequest(handle: OidcClientHandle, opts: { callbackUrl: string, scopes: string[] }): Promise<AuthorizationRequestParts> {
  const state = oidc.randomState()
  const nonce = oidc.randomNonce()
  const codeVerifier = oidc.randomPKCECodeVerifier()
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier)
  const url = oidc.buildAuthorizationUrl(handle.config, {
    redirect_uri: opts.callbackUrl,
    scope: opts.scopes.join(' '),
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })
  return { state, nonce, codeVerifier, url }
}

export interface ValidatedLogin {
  issuer: string
  subject: string
  idTokenClaims: Record<string, unknown>
  userInfoClaims: Record<string, unknown> | null
  /** `null` until `loadUserInfo` is called. */
  accessToken: string | undefined
}

/**
 * Exchange the authorization code. `callbackUrl` MUST be the canonical callback URL
 * (never derived from the request); the IdP response params are appended to it.
 * Throws on any validation failure (signature, iss, aud, exp, nonce, state, PKCE).
 */
export async function exchangeAuthorizationCode(
  handle: OidcClientHandle,
  opts: { callbackUrl: string, params: URLSearchParams, expectedState: string, expectedNonce: string, codeVerifier: string }
): Promise<ValidatedLogin> {
  const current = new URL(opts.callbackUrl)
  for (const [k, v] of opts.params.entries()) current.searchParams.append(k, v)

  const tokens = await oidc.authorizationCodeGrant(handle.config, current, {
    pkceCodeVerifier: opts.codeVerifier,
    expectedState: opts.expectedState,
    expectedNonce: opts.expectedNonce,
    idTokenExpected: true
  })
  const claims = tokens.claims()
  if (!claims || typeof claims.sub !== 'string' || claims.sub.length === 0) {
    throw new OidcClientError('id_token_invalid', 'id_token_missing_sub')
  }
  return {
    issuer: handle.issuer,
    subject: claims.sub,
    idTokenClaims: { ...claims } as Record<string, unknown>,
    userInfoClaims: null,
    accessToken: tokens.access_token
  }
}

/** Fetch UserInfo for the VALIDATED subject only (expectedSubject = ID token sub). */
export async function loadUserInfo(handle: OidcClientHandle, login: ValidatedLogin): Promise<Record<string, unknown> | null> {
  if (!handle.endpoints.userinfo || !login.accessToken) return null
  const info = await oidc.fetchUserInfo(handle.config, login.accessToken, login.subject)
  return { ...info } as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

function causeChain(err: unknown): unknown[] {
  const out: unknown[] = []
  let cur: unknown = err
  for (let i = 0; i < 5 && cur; i++) {
    out.push(cur)
    cur = (cur as { cause?: unknown }).cause
  }
  return out
}

/** Map any thrown error to a safe browser-facing code (details stay server-side). */
export function classifyOidcError(err: unknown): OidcErrorCode {
  const chain = causeChain(err)
  for (const e of chain) {
    if (e instanceof OidcClientError) {
      if (e.code === 'id_token_invalid') return 'oidc_token_invalid'
      return e.code === 'not_configured' ? 'oidc_not_configured' : 'oidc_unavailable'
    }
  }
  if (chain.some(e => e instanceof oidc.AuthorizationResponseError)) return 'oidc_provider_error'
  if (chain.some(e => e instanceof oidc.ResponseBodyError)) return 'oidc_provider_error'
  if (chain.some(e => e instanceof oidc.ClientError && (e.code === 'OAUTH_TIMEOUT' || e.code === 'OAUTH_ABORT'))) return 'oidc_unavailable'
  if (chain.some(e => e instanceof TypeError)) return 'oidc_unavailable'
  return 'oidc_token_invalid'
}

// ---------------------------------------------------------------------------
// Admin "check" (saved config, discovery only – no login, no mutation)
// ---------------------------------------------------------------------------

export async function checkOidcDiscovery(record: OidcConfigRecord, clientSecret: string | null): Promise<OidcCheckResultDto> {
  try {
    if (!record.issuer || !record.client_id) return { ok: false, code: 'not_configured' }
    // Fresh discovery; does not touch the shared cache and never writes config.
    const handle = await buildOidcClient({
      issuer: record.issuer,
      clientId: record.client_id,
      clientSecret,
      allowHttpIssuer: record.allow_http_issuer
    })
    return {
      ok: true,
      issuer: handle.issuer,
      token_endpoint_auth_method: handle.authMethod,
      id_token_alg: handle.idTokenAlg,
      endpoints: handle.endpoints,
      warnings: handle.warnings
    }
  } catch (err) {
    if (err instanceof OidcClientError) return { ok: false, code: err.code }
    return { ok: false, code: classifyOidcError(err) }
  }
}
