export type RowLayout = 'sequential' | 'odd-even' | 'even-odd'

export type PoeType = '802.3af' | '802.3at' | '802.3bt-type3' | '802.3bt-type4' | 'passive-24v' | 'passive-48v'

export interface PoeConfig {
  type: PoeType
  max_watts: number
}

export type AirflowDirection = 'front-to-rear' | 'rear-to-front' | 'left-to-right' | 'right-to-left' | 'passive' | 'mixed'

export interface LayoutBlock {
  id: string
  type: 'rj45' | 'sfp' | 'sfp+' | 'qsfp' | 'console' | 'management'
  count: number
  start_index: number
  rows: number
  row_layout?: RowLayout
  default_speed?: string
  label?: string
  physical_type?: 'rj45' | 'sfp'
  poe?: PoeConfig
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
  datasheet_url?: string
  airflow?: AirflowDirection
  units: LayoutUnit[]
  created_at: string
  updated_at: string
}
