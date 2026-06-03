export interface Network {
  id: string
  site_id: string
  slug: string
  name: string
  vlan_id?: string
  subnet: string
  gateway?: string
  dns_servers: string[]
  description?: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}
