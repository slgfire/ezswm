import { z } from 'zod'
import { BUILTIN_DEVICE_TYPES } from '../../types/ipAllocation'

const builtinDeviceType = z.enum(BUILTIN_DEVICE_TYPES)
// Custom device types are referenced by their stable UUID.
const customDeviceTypeId = z.string().uuid()
const assignableDeviceType = z.union([builtinDeviceType, customDeviceTypeId])

export const createIpAllocationSchema = z.object({
  ip_address: z.string().min(1),
  hostname: z.string().max(200).optional(),
  mac_address: z.string().optional(),
  device_type: assignableDeviceType.optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'reserved', 'inactive']).default('active')
})

export const updateIpAllocationSchema = z.object({
  network_id: z.string().uuid().optional(),
  ip_address: z.string().optional(),
  hostname: z.string().max(200).optional().nullable(),
  mac_address: z.string().optional().nullable(),
  // Bounded string: new assignments must be builtin or an active custom id, but
  // the repository also lets a form resubmit an unchanged legacy/inactive value.
  device_type: builtinDeviceType.or(customDeviceTypeId).or(z.string().trim().min(1).max(100)).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'reserved', 'inactive']).optional()
})
