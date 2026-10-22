import { z } from 'zod'

const FIVE_YEARS_MS = 5 * 366 * 24 * 60 * 60 * 1000

export const createApiTokenSchema = z.object({
  name: z.string().trim().min(1).max(100),
  // ISO-8601 UTC ("Z"), strictly in the future, at most ~5 years ahead.
  expires_at: z.string().datetime().nullable().optional()
}).strict().superRefine((v, ctx) => {
  if (!v.expires_at) return
  const t = Date.parse(v.expires_at)
  if (!(t > Date.now()) || t > Date.now() + FIVE_YEARS_MS) {
    ctx.addIssue({ code: 'custom', path: ['expires_at'], message: 'expires_at must be in the future and within 5 years' })
  }
})
