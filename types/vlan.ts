export type VlanStatus = 'active' | 'inactive'

export const VLAN_COLOR_POOL: string[] = [
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C',
  '#3498DB', '#9B59B6', '#34495E', '#E84393', '#00CEC9',
  '#6C5CE7', '#FDCB6E', '#FF7675', '#74B9FF', '#A29BFE',
  '#55EFC4', '#81ECEC', '#DFE6E9', '#636E72', '#B2BEC3',
  '#FAB1A0', '#FF9FF3', '#48DBFB', '#C8D6E5', '#FFA502'
]

export interface VLAN {
  id: string
  vlan_id: number
  name: string
  description?: string
  status: VlanStatus
  routing_device?: string
  color: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}
