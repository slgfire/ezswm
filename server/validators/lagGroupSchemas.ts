import { z } from 'zod'

export const createLagGroupSchema = z.object({
  name: z.string().min(1).max(100),
  port_ids: z.array(z.string()).min(2),
  remote_device: z.string().max(200).optional(),
  remote_device_id: z.string().optional(),
  description: z.string().max(500).optional()
})

export const updateLagGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  port_ids: z.array(z.string()).min(2).optional(),
  remote_device: z.string().max(200).optional().nullable(),
  remote_device_id: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable()
})
