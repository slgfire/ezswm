export interface PatchPanelToken {
  id: string
  patch_panel_id: string
  token: string
  created_at: string
  revoked_at: string | null
  last_access_at: string | null
}
