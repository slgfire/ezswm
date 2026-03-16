import type { Port } from './port'

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
  ports: Port[]
  is_favorite: boolean
  notes?: string
  created_at: string
  updated_at: string
}
