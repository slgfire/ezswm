import { z } from 'zod'

export const updateSettingsSchema = z.object({
  app_name: z.string().min(1).max(100).optional(),
  app_logo_url: z.string().max(500).optional().nullable(),
  default_vlan: z.number().int().min(1).max(4094).optional().nullable(),
  default_port_status: z.enum(['up', 'down', 'disabled']).optional(),
  port_speeds: z.array(z.string()).optional()
})
