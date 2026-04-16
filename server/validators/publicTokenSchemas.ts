import { z } from 'zod'

export const publicTokenSchema = z.object({
  id: z.string(),
  switch_id: z.string(),
  token: z.string().length(32),
  created_at: z.string(),
  revoked_at: z.string().nullable(),
  last_access_at: z.string().nullable()
})
