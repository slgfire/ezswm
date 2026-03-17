import { z } from 'zod'

const layoutBlockSchema = z.object({
  type: z.enum(['rj45', 'sfp', 'sfp+', 'qsfp', 'console', 'management']),
  count: z.number().int().positive(),
  start_index: z.number().int().positive(),
  rows: z.number().int().positive(),
  row_layout: z.enum(['sequential', 'odd-even', 'even-odd']).optional(),
  label: z.string().max(100).optional()
})

const layoutUnitSchema = z.object({
  unit_number: z.number().int().positive(),
  label: z.string().max(100).optional(),
  blocks: z.array(layoutBlockSchema).min(1)
})

export const createLayoutTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  units: z.array(layoutUnitSchema).min(1)
})

export const updateLayoutTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  manufacturer: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  units: z.array(layoutUnitSchema).min(1).optional()
})
