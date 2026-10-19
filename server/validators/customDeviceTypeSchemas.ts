import { z } from 'zod'

// Custom device type names are trimmed and bounded; the repository owns
// case-insensitive uniqueness and builtin-name conflicts (409).
const customDeviceTypeName = z.string().trim().min(1).max(100)

export const createCustomDeviceTypeSchema = z.object({
  name: customDeviceTypeName
})

export const updateCustomDeviceTypeSchema = z.object({
  name: customDeviceTypeName.optional(),
  active: z.boolean().optional()
})
