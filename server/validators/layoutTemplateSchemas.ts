import { z } from 'zod'

const poeConfigSchema = z.object({
  type: z.enum(['802.3af', '802.3at', '802.3bt-type3', '802.3bt-type4', 'passive-24v', 'passive-48v']),
  max_watts: z.number().positive()
})

const layoutBlockSchema = z.object({
  type: z.enum(['rj45', 'sfp', 'sfp+', 'qsfp', 'console', 'management']),
  count: z.number().int().positive(),
  start_index: z.number().int().min(0),
  rows: z.number().int().positive(),
  row_layout: z.preprocess(v => v === '' ? undefined : v, z.enum(['sequential', 'odd-even', 'even-odd']).optional()),
  default_speed: z.preprocess(v => v === '' ? undefined : v, z.enum(['100M', '1G', '2.5G', '10G', '100G']).optional()),
  label: z.string().max(100).optional(),
  physical_type: z.preprocess(v => v === '' ? undefined : v, z.enum(['rj45', 'sfp']).optional()),
  poe: poeConfigSchema.optional()
}).refine(data => {
  if (data.physical_type && data.type !== 'management') return false
  return true
}, { message: 'physical_type is only valid for management ports' })

const layoutUnitSchema = z.object({
  unit_number: z.number().int().positive(),
  label: z.string().max(100).optional(),
  blocks: z.array(layoutBlockSchema).min(1)
})

const airflowEnum = z.enum(['front-to-rear', 'rear-to-front', 'left-to-right', 'right-to-left', 'passive', 'mixed'])

export const createLayoutTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  datasheet_url: z.string().url().max(500).optional(),
  airflow: z.preprocess(v => v === '' ? undefined : v, airflowEnum.optional()),
  units: z.array(layoutUnitSchema).min(1)
})

export const updateLayoutTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  manufacturer: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  datasheet_url: z.string().url().max(500).optional().nullable(),
  airflow: z.preprocess(v => v === '' ? undefined : v, airflowEnum.optional().nullable()),
  units: z.array(layoutUnitSchema).min(1).optional()
})
