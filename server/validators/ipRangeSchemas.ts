import { z } from 'zod'

export const createIpRangeSchema = z.object({
  start_ip: z.string().min(1),
  end_ip: z.string().min(1),
  type: z.enum(['static', 'dhcp', 'reserved']),
  description: z.string().max(500).optional()
})

export const updateIpRangeSchema = z.object({
  start_ip: z.string().optional(),
  end_ip: z.string().optional(),
  type: z.enum(['static', 'dhcp', 'reserved']).optional(),
  description: z.string().max(500).optional().nullable()
})
