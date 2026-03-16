export interface User {
  id: string
  username: string
  display_name: string
  password_hash: string
  role: 'admin' | 'viewer'
  language: 'en' | 'de'
  is_setup_user: boolean
  created_at: string
  updated_at: string
}
