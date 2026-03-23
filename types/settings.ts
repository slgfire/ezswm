export interface AppSettings {
  app_name: string
  app_logo_url: string | null
  default_vlan: number | null
  default_port_status: 'up' | 'down' | 'disabled'
  pagination_size: number
  port_speeds: string[]
  setup_completed: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  app_name: 'ezSWM',
  app_logo_url: null,
  default_vlan: null,
  default_port_status: 'down',
  pagination_size: 25,
  port_speeds: ['100M', '1G', '2.5G', '10G', '100G'],
  setup_completed: false
}
