export type UserRole = 'admin' | 'viewer'
export type UserAuthProvider = 'local' | 'oidc'

export interface User {
  id: string
  username: string
  display_name: string
  /** `null` for OIDC-provisioned users (they have no local password). */
  password_hash: string | null
  role: UserRole
  language: 'en' | 'de'
  is_setup_user: boolean
  created_at: string
  updated_at: string
  auth_provider: UserAuthProvider
  oidc_issuer: string | null
  oidc_subject: string | null
  /** Bumped after a validated OIDC login is denied; invalidates older OIDC JWTs. */
  oidc_session_version: number
}

/** User as exposed to API clients (no password hash). */
export type SafeUser = Omit<User, 'password_hash'>
