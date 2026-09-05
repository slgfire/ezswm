export type PatchPanelPortCount = 12 | 24 | 48

export type PatchPanelSocketSide = 'L' | 'R'

export interface PatchPanelSocket {
  id: string
  patch_panel_id: string
  port_number: number
  side?: PatchPanelSocketSide
  outlet_number?: string
  location?: string
  tested: boolean
  created_at: string
  updated_at: string
}

export interface PatchPanel {
  id: string
  site_id: string
  slug: string
  name: string
  description?: string
  port_count: PatchPanelPortCount
  sockets: PatchPanelSocket[]
  created_at: string
  updated_at: string
}
