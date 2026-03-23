export interface LAGGroup {
  id: string
  switch_id: string
  name: string
  port_ids: string[]
  remote_device?: string
  remote_device_id?: string
  description?: string
  created_at: string
  updated_at: string
}
