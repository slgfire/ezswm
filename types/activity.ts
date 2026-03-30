export type ActivityAction = 'create' | 'update' | 'delete' | 'duplicate' | 'update_port' | 'bulk_update_ports'

export interface ActivityEntry {
  id: string
  user_id: string
  action: ActivityAction
  entity_type: string
  entity_id: string
  entity_name: string
  changes?: Record<string, unknown>
  previous_state?: Record<string, unknown>
  metadata?: Record<string, unknown>
  timestamp: string
}
