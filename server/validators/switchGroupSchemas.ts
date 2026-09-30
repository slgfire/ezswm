import { z } from 'zod'

export const createSwitchGroupSchema = z.object({
  site_id: z.string().min(1),
  name: z.string().min(1).max(100),
  sort_order: z.number().int().min(0).optional()
})

export const updateSwitchGroupSchema = z.object({
  site_id: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().min(0).optional().nullable()
})

export const sortSwitchGroupsSchema = z.object({
  order: z.array(z.string()).min(1)
})
