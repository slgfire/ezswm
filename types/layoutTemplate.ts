export interface LayoutBlock {
  id: string
  type: 'rj45' | 'sfp' | 'sfp+' | 'console' | 'management'
  count: number
  start_index: number
  rows: number
  label?: string
}

export interface LayoutUnit {
  unit_number: number
  label?: string
  blocks: LayoutBlock[]
}

export interface LayoutTemplate {
  id: string
  name: string
  manufacturer?: string
  model?: string
  description?: string
  units: LayoutUnit[]
  created_at: string
  updated_at: string
}
