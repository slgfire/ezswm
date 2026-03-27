export type VlanStatus = 'active' | 'inactive'

// Tailwind CSS colors for consistent theming
export const VLAN_COLOR_POOL: string[] = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', // red-500, orange-500, yellow-500, green-500, teal-500
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', // cyan-500, blue-500, violet-500, pink-500, indigo-500
  '#10B981', '#0EA5E9', '#A855F7', '#F43F5E', '#84CC16', // emerald-500, sky-500, purple-500, rose-500, lime-500
  '#F59E0B', '#2DD4BF', '#818CF8', '#FB923C', '#34D399', // amber-500, teal-400, indigo-400, orange-400, emerald-400
  '#38BDF8', '#C084FC', '#FB7185', '#A3E635', '#FBBF24'  // sky-400, purple-400, rose-400, lime-400, amber-400
]

export interface VLAN {
  id: string
  site_id: string
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
