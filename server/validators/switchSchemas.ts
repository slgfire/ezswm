import { z } from 'zod'

export const createSwitchSchema = z.object({
  name: z.string().min(1).max(100),
  model: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  rack_position: z.string().max(50).optional(),
  management_ip: z.string().optional(),
  firmware_version: z.string().max(100).optional(),
  layout_template_id: z.string().optional(),
  notes: z.string().max(2000).optional()
})

export const updateSwitchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  model: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(100).optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  rack_position: z.string().max(50).optional().nullable(),
  management_ip: z.string().optional().nullable(),
  firmware_version: z.string().max(100).optional().nullable(),
  layout_template_id: z.string().optional().nullable(),
  is_favorite: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable()
})

export const updatePortSchema = z.object({
  label: z.string().max(50).optional().nullable(),
  speed: z.preprocess(v => v === '' ? null : v, z.enum(['100M', '1G', '2.5G', '10G', '100G']).optional().nullable()),
  status: z.enum(['up', 'down', 'disabled']).optional(),
  native_vlan: z.number().int().min(1).max(4094).optional().nullable(),
  tagged_vlans: z.array(z.number().int().min(1).max(4094)).optional(),
  connected_device: z.string().max(200).optional().nullable(),
  connected_device_id: z.string().optional().nullable(),
  connected_port_id: z.string().optional().nullable(),
  connected_port: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  mac_address: z.string().optional().nullable(),
  lag_group_id: z.string().optional().nullable()
})

export const bulkUpdatePortsSchema = z.object({
  port_ids: z.array(z.string()).min(1),
  updates: z.object({
    status: z.enum(['up', 'down', 'disabled']).optional(),
    native_vlan: z.number().int().min(1).max(4094).optional().nullable(),
    tagged_vlans: z.array(z.number().int().min(1).max(4094)).optional(),
    speed: z.preprocess(v => v === '' ? null : v, z.enum(['100M', '1G', '2.5G', '10G', '100G']).optional().nullable()),
    description: z.string().max(500).optional().nullable()
  })
})
