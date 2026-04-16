import { z } from 'zod'

export const createSwitchSchema = z.object({
  site_id: z.string().min(1),
  name: z.string().min(1).max(100),
  model: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  rack_position: z.string().max(50).optional(),
  management_ip: z.string().optional(),
  firmware_version: z.string().max(100).optional(),
  layout_template_id: z.string().optional(),
  stack_size: z.number().int().min(1).max(8).optional(),
  role: z.enum(['core', 'distribution', 'access', 'management']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(2000).optional()
})

export const updateSwitchSchema = z.object({
  site_id: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  model: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(100).optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  rack_position: z.string().max(50).optional().nullable(),
  management_ip: z.string().optional().nullable(),
  firmware_version: z.string().max(100).optional().nullable(),
  layout_template_id: z.string().optional().nullable(),
  stack_size: z.number().int().min(1).max(8).optional().nullable(),
  role: z.enum(['core', 'distribution', 'access', 'management']).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
  is_favorite: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable()
})

export const updatePortSchema = z.object({
  label: z.string().max(50).optional().nullable(),
  speed: z.preprocess(v => v === '' ? null : v, z.enum(['100M', '1G', '2.5G', '10G', '100G']).optional().nullable()),
  status: z.enum(['up', 'down', 'disabled']).optional(),
  port_mode: z.preprocess(v => v === '' ? null : v, z.enum(['access', 'trunk']).optional().nullable()),
  access_vlan: z.number().int().min(1).max(4094).optional().nullable(),
  native_vlan: z.number().int().min(1).max(4094).optional().nullable(),
  tagged_vlans: z.array(z.number().int().min(1).max(4094)).optional(),
  connected_device: z.string().max(200).optional().nullable(),
  connected_device_id: z.string().optional().nullable(),
  connected_port_id: z.string().optional().nullable(),
  connected_port: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  mac_address: z.string().optional().nullable(),
  lag_group_id: z.string().optional().nullable(),
  connected_allocation_id: z.string().optional().nullable(),
  poe: z.union([
    z.object({
      type: z.enum(['802.3af', '802.3at', '802.3bt-type3', '802.3bt-type4', 'passive-24v', 'passive-48v']),
      max_watts: z.number().positive()
    }),
    z.null()
  ]).optional(),
  helper_usage: z.enum(['participant', 'phone_passthrough', 'ap', 'printer', 'orga', 'uplink']).nullable().optional(),
  helper_label: z.string().max(100).nullable().optional(),
  show_in_helper_list: z.boolean().optional()
})

export const bulkUpdatePortsSchema = z.object({
  port_ids: z.array(z.string()).min(1),
  updates: z.object({
    status: z.enum(['up', 'down', 'disabled']).optional(),
    port_mode: z.preprocess(v => v === '' ? null : v, z.enum(['access', 'trunk']).optional().nullable()),
    access_vlan: z.number().int().min(1).max(4094).optional().nullable(),
    native_vlan: z.number().int().min(1).max(4094).optional().nullable(),
    tagged_vlans: z.array(z.number().int().min(1).max(4094)).optional(),
    speed: z.preprocess(v => v === '' ? null : v, z.enum(['100M', '1G', '2.5G', '10G', '100G']).optional().nullable()),
    description: z.string().max(500).optional().nullable(),
    helper_usage: z.enum(['participant', 'phone_passthrough', 'ap', 'printer', 'orga', 'uplink']).nullable().optional()
  })
})
