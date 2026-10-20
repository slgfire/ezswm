/** API token metadata as exposed to clients. Never contains the secret or its hash. */
export interface ApiTokenDto {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
}

/** Creation response: the plaintext `token` is returned exactly once. */
export interface ApiTokenCreated extends ApiTokenDto {
  token: string
}

export const API_TOKEN_PREFIX = 'ezswm_'
export const API_TOKEN_MAX_PER_USER = 10
