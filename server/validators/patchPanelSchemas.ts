import { z } from 'zod'

const patchPanelPortCountSchema = z.union([
  z.literal(12),
  z.literal(24),
  z.literal(48)
])

export const createPatchPanelSchema = z.object({
  site_id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  port_count: patchPanelPortCountSchema
}).strict()

export const updatePatchPanelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  slug: z.string().min(1).max(120).optional()
}).strict()

export const updatePatchPanelSocketSchema = z.object({
  side: z.enum(['L', 'R']).optional().nullable(),
  outlet_number: z.string().max(120).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  tested: z.boolean().optional()
}).strict()
