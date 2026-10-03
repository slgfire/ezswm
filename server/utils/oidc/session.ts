import { randomBytes } from 'node:crypto'
import type {
  OidcConfigDto,
  OidcConfigRecord,
  OidcErrorCode,
  OidcSessionClaims
} from '../../../types/oidc'
import type { User } from '../../../types/user'
import { oidcConfigRepository } from '../../repositories/oidcConfigRepository'
import { oidcLoginTxnRepository } from '../../repositories/oidcLoginTxnRepository'
import { userRepository } from '../../repositories/userRepository'
import { sanitizeReturnTo } from '../../validators/oidcSchemas'
import { decideOidcAccess, deriveDisplayName, needsUserInfoForGroups, resolveGroups } from './claims'
import {
  classifyOidcError,
  createAuthorizationRequest,
  exchangeAuthorizationCode,
  getOidcClient,
  loadUserInfo,
  resolveOidcCallbackUrl
} from './client'
import {
  canDecryptOidcSecret,
  decryptOidcSecret,
  getOidcKeyState,
  sha256Hex,
  type OidcKeyState
} from './crypto'

/**
 * OIDC login orchestration (start/complete), binding cookie helpers, readiness,
 * config DTO and OIDC JWT session-claim validation. Route handlers (other lane)
 * stay thin and call into this module.
 */

// ---------------------------------------------------------------------------
// Runtime settings (env → runtimeConfig)
//   OIDC_ENCRYPTION_KEY → runtimeConfig.oidcEncryptionKey (NUXT_OIDC_ENCRYPTION_KEY also works)
//   PUBLIC_BASE_URL     → runtimeConfig.publicBaseUrl     (NUXT_PUBLIC_BASE_URL also works)
// ---------------------------------------------------------------------------

export interface OidcRuntimeSettings {
  jwtSecret: string
  oidcEncryptionKey: string
  publicBaseUrl: string
}

export function readOidcRuntimeSettings(): OidcRuntimeSettings {
  const config = useRuntimeConfig() as unknown as Partial<OidcRuntimeSettings>
  return {
    jwtSecret: config.jwtSecret ?? '',
    oidcEncryptionKey: config.oidcEncryptionKey ?? '',
    publicBaseUrl: config.publicBaseUrl ?? ''
  }
}

export function getKeyState(settings: OidcRuntimeSettings): OidcKeyState {
  return getOidcKeyState(settings.oidcEncryptionKey, settings.jwtSecret)
}

// ---------------------------------------------------------------------------
// Readiness, secret, DTO
// ---------------------------------------------------------------------------

export type OidcUnavailableReason = 'disabled' | 'incomplete' | 'key_unavailable' | 'secret_undecryptable'

export type OidcRuntime =
  | { ready: true, clientSecret: string | null }
  | { ready: false, reason: OidcUnavailableReason }

/** Resolve whether SSO can operate and the plaintext client secret (if any). Fails closed. */
export function resolveOidcRuntime(record: OidcConfigRecord, settings: OidcRuntimeSettings): OidcRuntime {
  if (!record.enabled) return { ready: false, reason: 'disabled' }
  if (!record.issuer || !record.client_id) return { ready: false, reason: 'incomplete' }
  if (!record.client_secret_ciphertext) return { ready: true, clientSecret: null }
  const keyState = getKeyState(settings)
  if (!keyState.ready || !keyState.key) return { ready: false, reason: 'key_unavailable' }
  try {
    return { ready: true, clientSecret: decryptOidcSecret(record.client_secret_ciphertext, keyState.key) }
  } catch {
    return { ready: false, reason: 'secret_undecryptable' }
  }
}

/** Effective readiness for GET /api/auth/oidc/status (public, boolean only). */
export function isOidcEffectivelyEnabled(record: OidcConfigRecord, settings: OidcRuntimeSettings): boolean {
  return resolveOidcRuntime(record, settings).ready
}

export function buildOidcConfigDto(record: OidcConfigRecord, settings: OidcRuntimeSettings, requestOrigin: string): OidcConfigDto {
  const keyState = getKeyState(settings)
  return {
    enabled: record.enabled,
    issuer: record.issuer,
    client_id: record.client_id,
    client_secret_configured: record.client_secret_ciphertext !== null,
    scopes: record.scopes,
    groups_claim: record.groups_claim,
    admin_groups: record.admin_groups,
    viewer_groups: record.viewer_groups,
    allow_unmatched_viewer: record.allow_unmatched_viewer,
    allow_http_issuer: record.allow_http_issuer,
    observed_groups: record.observed_groups,
    provider_name: record.provider_name,
    config_revision: record.config_revision,
    updated_at: record.updated_at,
    callback_url: resolveOidcCallbackUrl(settings.publicBaseUrl, requestOrigin),
    encryption_key_ready: keyState.ready,
    secret_decryptable: record.client_secret_ciphertext === null
      ? true
      : canDecryptOidcSecret(record.client_secret_ciphertext, keyState.key)
  }
}

// ---------------------------------------------------------------------------
// Browser binding cookie
// ---------------------------------------------------------------------------

export const OIDC_BINDING_COOKIE = 'ezswm_oidc_bind'
export const OIDC_BINDING_MAX_AGE_SECONDS = 24 * 60 * 60
const BINDING_RE = /^[A-Za-z0-9_-]{43}$/

export function generateBindingValue(): string {
  return randomBytes(32).toString('base64url')
}

export function isValidBindingValue(value: unknown): value is string {
  return typeof value === 'string' && BINDING_RE.test(value)
}

export function hashBindingValue(value: string): string {
  return sha256Hex(`oidc-binding:${value}`)
}

/** Options for setCookie(OIDC_BINDING_COOKIE, …). Path is scoped to the OIDC endpoints. */
export function bindingCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    maxAge: OIDC_BINDING_MAX_AGE_SECONDS,
    path: '/api/auth/oidc'
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

export type BeginResult =
  | { ok: true, redirectUrl: string, bindingValue: string, bindingIsNew: boolean }
  | { ok: false, code: OidcErrorCode }

/**
 * Start a login. The binding cookie is stable: reuse an existing valid one
 * (multi-tab), otherwise mint a new one (caller sets the cookie iff `bindingIsNew`).
 */
export async function beginOidcLogin(input: {
  settings: OidcRuntimeSettings
  requestOrigin: string
  existingBinding?: string | null
  returnTo?: unknown
}): Promise<BeginResult> {
  const record = await oidcConfigRepository.get()
  const runtime = resolveOidcRuntime(record, input.settings)
  if (!runtime.ready) return { ok: false, code: runtime.reason === 'disabled' || runtime.reason === 'incomplete' ? 'oidc_not_configured' : 'oidc_unavailable' }

  try {
    const handle = await getOidcClient(record, runtime.clientSecret)
    const callbackUrl = resolveOidcCallbackUrl(input.settings.publicBaseUrl, input.requestOrigin)
    const auth = await createAuthorizationRequest(handle, { callbackUrl, scopes: record.scopes })

    const bindingIsNew = !isValidBindingValue(input.existingBinding)
    const bindingValue = bindingIsNew ? generateBindingValue() : (input.existingBinding as string)

    await oidcLoginTxnRepository.create({
      state: auth.state,
      nonce: auth.nonce,
      codeVerifier: auth.codeVerifier,
      bindingHash: hashBindingValue(bindingValue),
      configRevision: record.config_revision,
      returnTo: sanitizeReturnTo(input.returnTo)
    })
    return { ok: true, redirectUrl: auth.url.toString(), bindingValue, bindingIsNew }
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 429) throw err
    return { ok: false, code: classifyOidcError(err) }
  }
}

// ---------------------------------------------------------------------------
// Complete (callback)
// ---------------------------------------------------------------------------

export type CompleteResult =
  | { ok: true, user: User, returnTo: string, configRevision: number }
  | { ok: false, code: OidcErrorCode, detail?: string }

/**
 * Finish a login. Order matters for security:
 *  1. Validate request shape; consume the single-use txn (state + browser binding + revision).
 *  2. Code exchange with PKCE/state/nonce + signature validation (throws on any attack).
 *  3. ONLY THEN is (issuer, sub) trusted: map groups → role. On mapping denial for an
 *     existing account, bump oidc_session_version. Unvalidated input never has identity effects.
 *  4. Provision/sync the user; record observed groups (successful logins only).
 */
export async function completeOidcLogin(input: {
  settings: OidcRuntimeSettings
  requestOrigin: string
  query: URLSearchParams
  bindingValue?: string | null
}): Promise<CompleteResult> {
  const state = input.query.get('state')
  if (!state || !isValidBindingValue(input.bindingValue)) {
    return { ok: false, code: 'oidc_transaction_invalid', detail: 'missing_state_or_binding' }
  }

  const record = await oidcConfigRepository.get()
  const runtime = resolveOidcRuntime(record, input.settings)
  if (!runtime.ready) {
    return { ok: false, code: runtime.reason === 'disabled' || runtime.reason === 'incomplete' ? 'oidc_not_configured' : 'oidc_unavailable', detail: runtime.reason }
  }

  const consumed = await oidcLoginTxnRepository.consume({
    state,
    bindingHash: hashBindingValue(input.bindingValue),
    currentRevision: record.config_revision
  })
  if (!consumed.ok) return { ok: false, code: 'oidc_transaction_invalid', detail: consumed.reason }
  const txn = consumed.txn

  if (input.query.get('error')) {
    return { ok: false, code: 'oidc_provider_error', detail: input.query.get('error') ?? undefined }
  }
  if (!input.query.get('code')) return { ok: false, code: 'oidc_invalid_request', detail: 'missing_code' }

  let login
  let userInfo: Record<string, unknown> | null = null
  try {
    const handle = await getOidcClient(record, runtime.clientSecret)
    const callbackUrl = resolveOidcCallbackUrl(input.settings.publicBaseUrl, input.requestOrigin)
    login = await exchangeAuthorizationCode(handle, {
      callbackUrl,
      params: input.query,
      expectedState: state,
      expectedNonce: txn.nonce,
      codeVerifier: txn.code_verifier
    })
    if (needsUserInfoForGroups(login.idTokenClaims, record.groups_claim)) {
      userInfo = await loadUserInfo(handle, login)
    }
  } catch (err) {
    return { ok: false, code: classifyOidcError(err), detail: err instanceof Error ? err.name : 'error' }
  }

  // ---- identity is now cryptographically validated ----
  const status = resolveGroups(login.idTokenClaims, record.groups_claim, userInfo)
  const decision = decideOidcAccess(status, {
    adminGroups: record.admin_groups,
    viewerGroups: record.viewer_groups,
    allowUnmatchedViewer: record.allow_unmatched_viewer
  })
  if (!decision.ok) {
    await userRepository.invalidateOidcSessions(login.issuer, login.subject)
    return { ok: false, code: 'oidc_access_denied', detail: decision.reason }
  }

  const fallbackName = login.subject
  const { user } = await userRepository.provisionOrSyncOidcUser({
    issuer: login.issuer,
    subject: login.subject,
    role: decision.role,
    displayName: deriveDisplayName({ ...(userInfo ?? {}), ...login.idTokenClaims }, fallbackName)
  })
  if (decision.groups.length > 0) await oidcConfigRepository.recordObservedGroups(decision.groups)

  return { ok: true, user, returnTo: txn.return_to ?? '/', configRevision: record.config_revision }
}

// ---------------------------------------------------------------------------
// OIDC JWT session claims (used by the auth middleware/lane when issuing/validating)
// ---------------------------------------------------------------------------

export function buildOidcSessionClaims(user: Pick<User, 'oidc_session_version'>, config: Pick<OidcConfigRecord, 'config_revision'>): OidcSessionClaims {
  return { ap: 'oidc', osv: user.oidc_session_version, orev: config.config_revision }
}

/**
 * An OIDC-issued JWT is only valid while: the user is still an OIDC account, SSO is
 * enabled, the config revision matches, and the session version is unchanged.
 * (The user's role always comes from the DB row, never from the token.)
 */
export function isOidcSessionCurrent(
  user: Pick<User, 'auth_provider' | 'oidc_session_version'>,
  claims: Partial<OidcSessionClaims> | null | undefined,
  config: Pick<OidcConfigRecord, 'enabled' | 'config_revision'>
): boolean {
  if (user.auth_provider !== 'oidc') return false
  if (!claims || claims.ap !== 'oidc') return false
  if (!config.enabled) return false
  return claims.orev === config.config_revision && claims.osv === user.oidc_session_version
}
