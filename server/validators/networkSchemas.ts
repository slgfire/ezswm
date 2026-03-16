import { z } from 'zod'

export const createNetworkSchema = z.object({
  name: z.string().min(1).max(100),
  vlan_id: z.string().optional(),
  subnet: z.string().min(1),
  gateway: z.string().optional(),
  dns_servers: z.array(z.string()).default([]),
  description: z.string().max(500).optional()
})

export const updateNetworkSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  vlan_id: z.string().optional().nullable(),
  subnet: z.string().optional(),
  gateway: z.string().optional().nullable(),
  dns_servers: z.array(z.string()).optional(),
  description: z.string().max(500).optional().nullable(),
  is_favorite: z.boolean().optional()
})
