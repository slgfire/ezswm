import { z } from 'zod'

export const createVlanSchema = z.object({
  site_id: z.string().min(1),
  vlan_id: z.number().int().min(1).max(4094),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  routing_device: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional()
})

export const updateVlanSchema = z.object({
  site_id: z.string().min(1).optional(),
  vlan_id: z.number().int().min(1).max(4094).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  routing_device: z.string().max(200).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_favorite: z.boolean().optional()
})
