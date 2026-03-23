export type RangeType = 'static' | 'dhcp' | 'reserved'

export interface IPRange {
  id: string
  network_id: string
  start_ip: string
  end_ip: string
  type: RangeType
  description?: string
  created_at: string
  updated_at: string
}
