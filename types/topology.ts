export interface TopologyNode {
  id: string
  name: string
  model?: string
  manufacturer?: string
  location?: string
  management_ip?: string
  role?: string
  port_count: number
  ports_up: number
  ports_down: number
  ports_disabled: number
}

export interface TopologyLink {
  id: string
  source_switch_id: string
  source_port_id: string
  source_port_label: string
  target_switch_id: string
  target_port_id: string
  target_port_label: string
  lag_group_id?: string
  lag_name?: string
  vlans: number[]
}

export interface TopologyGhostNode {
  id: string
  name: string
  site_id: string
  site_name: string
}

export interface TopologyLayout {
  node_positions: Record<string, { x: number; y: number }>
  updated_at: string
}
