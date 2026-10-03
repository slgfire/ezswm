import type { UserRole } from './user'

/** Safe, stable error codes surfaced to browsers from the OIDC callback flow. */
export type OidcErrorCode =
  | 'oidc_not_configured'
  | 'oidc_invalid_request'
  | 'oidc_transaction_invalid'
  | 'oidc_provider_error'
  | 'oidc_token_invalid'
  | 'oidc_access_denied'
  | 'oidc_unavailable'

/** Server-side record of the singleton OIDC config (contains ciphertext – never send to clients). */
export interface OidcConfigRecord {
  enabled: boolean
  issuer: string | null
  client_id: string | null
  client_secret_ciphertext: string | null
  scopes: string[]
  groups_claim: string
  admin_groups: string[]
  viewer_groups: string[]
  allow_unmatched_viewer: boolean
  allow_http_issuer: boolean
  observed_groups: string[]
  /** Optional plain-text login branding (cosmetic; not part of security policy). */
  provider_name: string | null
  config_revision: number
  updated_at: string
}

/** Client-facing DTO for GET/PUT /api/auth/oidc/config (admin only). */
export interface OidcConfigDto {
  enabled: boolean
  issuer: string | null
  client_id: string | null
  /** Only a boolean; the secret/ciphertext/key are never exposed. */
  client_secret_configured: boolean
  scopes: string[]
  groups_claim: string
  admin_groups: string[]
  viewer_groups: string[]
  allow_unmatched_viewer: boolean
  allow_http_issuer: boolean
  observed_groups: string[]
  provider_name: string | null
  config_revision: number
  updated_at: string
  callback_url: string
  encryption_key_ready: boolean
  secret_decryptable: boolean
}

/** PUT /api/auth/oidc/config body (all optional). */
export interface OidcConfigUpdateInput {
  enabled?: boolean
  issuer?: string | null
  client_id?: string | null
  /** Omit to retain the stored secret. */
  client_secret?: string
  /** `true` clears the stored secret (mutually exclusive with `client_secret`). */
  client_secret_clear?: boolean
  scopes?: string[]
  groups_claim?: string
  admin_groups?: string[]
  viewer_groups?: string[]
  allow_unmatched_viewer?: boolean
  allow_http_issuer?: boolean
  /** Plain-text display name; omit to retain, null/blank clears. */
  provider_name?: string | null
}

/** GET /api/auth/oidc/status (public). */
export interface OidcStatusDto {
  enabled: boolean
  /** Public branding only; present only when SSO is effectively enabled and a name is set. */
  provider_name?: string
}

/** POST /api/auth/oidc/check result (admin; validates the SAVED config, no login). */
export interface OidcCheckResultDto {
  ok: boolean
  code?: string
  issuer?: string
  token_endpoint_auth_method?: 'client_secret_basic' | 'client_secret_post' | 'none'
  id_token_alg?: string
  endpoints?: { authorization: boolean, token: boolean, jwks: boolean, userinfo: boolean }
  warnings?: string[]
}

export type OidcGroupsStatus =
  | { status: 'ok', groups: string[] }
  | { status: 'missing' }
  | { status: 'malformed', reason: string }
  | { status: 'overage' }

export type OidcAccessDecision =
  | { ok: true, role: UserRole, groups: string[] }
  | { ok: false, reason: 'groups_missing' | 'groups_malformed' | 'groups_overage' | 'no_matching_group' }

export interface OidcRoleRules {
  adminGroups: string[]
  viewerGroups: string[]
  allowUnmatchedViewer: boolean
}

/** Claims carried by an OIDC-issued ezSWM JWT in addition to sub/username/role. */
export interface OidcSessionClaims {
  ap: 'oidc'
  /** user.oidc_session_version at issue time */
  osv: number
  /** OIDC config_revision at issue time */
  orev: number
}
