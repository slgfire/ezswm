import { z } from 'zod'

export const createIpAllocationSchema = z.object({
  ip_address: z.string().min(1),
  hostname: z.string().max(200).optional(),
  mac_address: z.string().optional(),
  device_type: z.enum(['server', 'switch', 'router', 'firewall', 'printer', 'phone', 'ap', 'camera', 'other']).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'reserved', 'inactive']).default('active')
})

export const updateIpAllocationSchema = z.object({
  ip_address: z.string().optional(),
  hostname: z.string().max(200).optional().nullable(),
  mac_address: z.string().optional().nullable(),
  device_type: z.enum(['server', 'switch', 'router', 'firewall', 'printer', 'phone', 'ap', 'camera', 'other']).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'reserved', 'inactive']).optional()
})
