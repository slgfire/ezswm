import type { Port } from './port'

export type ManagementProtocol = 'https' | 'http'

export type SwitchRole = 'core' | 'distribution' | 'access' | 'management'

export interface Switch {
  id: string
  site_id: string
  slug: string
  name: string
  model?: string
  manufacturer?: string
  serial_number?: string
  location?: string
  rack_position?: string
  management_ip?: string
  management_protocol?: ManagementProtocol
  management_url?: string
  firmware_version?: string
  layout_template_id?: string
  stack_size?: number
  role?: SwitchRole
  tags?: string[]
  ports: Port[]
  configured_vlans: number[]
  is_favorite: boolean
  sort_order?: number
  notes?: string
  group_id?: string
  expected_updated_at?: string
  created_at: string
  updated_at: string
}
