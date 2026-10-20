import { z } from 'zod'
import { BUILTIN_DEVICE_TYPES } from '../../types/ipAllocation'

// Only the nine immutable builtin keys may be disabled; no duplicates.
const disabledBuiltinDeviceTypes = z
  .array(z.enum(BUILTIN_DEVICE_TYPES))
  .max(BUILTIN_DEVICE_TYPES.length)
  .refine(values => new Set(values).size === values.length, { message: 'Duplicate device type' })

export const updateSettingsSchema = z.object({
  app_name: z.string().min(1).max(100).optional(),
  app_logo_url: z.string().max(500).optional().nullable(),
  default_vlan: z.number().int().min(1).max(4094).optional().nullable(),
  default_port_status: z.enum(['up', 'down', 'disabled']).optional(),
  port_speeds: z.array(z.string()).optional(),
  patch_panels_enabled: z.boolean().optional(),
  switch_groups_enabled: z.boolean().optional(),
  disabled_builtin_device_types: disabledBuiltinDeviceTypes.optional()
})
