import type { Port } from './port'

export type SwitchRole = 'core' | 'distribution' | 'access' | 'management'

export interface Switch {
  id: string
  name: string
  model?: string
  manufacturer?: string
  serial_number?: string
  location?: string
  rack_position?: string
  management_ip?: string
  firmware_version?: string
  layout_template_id?: string
  role?: SwitchRole
  tags?: string[]
  ports: Port[]
  is_favorite: boolean
  sort_order?: number
  notes?: string
  created_at: string
  updated_at: string
}
