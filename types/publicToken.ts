export interface PublicToken {
  id: string
  switch_id: string
  token: string
  created_at: string
  revoked_at: string | null
  last_access_at: string | null
}
