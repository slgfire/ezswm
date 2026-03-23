import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric with underscores'),
  display_name: z.string().min(1).max(100),
  password: z.string().min(8),
  role: z.enum(['admin', 'viewer']).default('admin'),
  language: z.enum(['en', 'de']).default('en')
})

export const updateUserSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'viewer']).optional(),
  language: z.enum(['en', 'de']).optional()
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8)
})

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember_me: z.boolean().default(false)
})

export const setupSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  display_name: z.string().min(1).max(100),
  password: z.string().min(8),
  language: z.enum(['en', 'de']).default('en')
})
