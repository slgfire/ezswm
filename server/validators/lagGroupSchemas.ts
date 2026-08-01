import { z } from 'zod'

export const createLagGroupSchema = z.object({
  name: z.string().min(1).max(100),
  port_ids: z.array(z.string()).min(2).refine(ids => new Set(ids).size === ids.length, 'port_ids must be distinct'),
  remote_device: z.string().max(200).optional(),
  remote_device_id: z.string().optional(),
  description: z.string().max(500).optional(),
  sync: z.object({
    remote_switch_id: z.string().min(1),
    mappings: z.array(z.object({ local_port_id: z.string().min(1), remote_port_id: z.string().min(1) })).min(2).refine(items => new Set(items.map(item => item.local_port_id)).size === items.length && new Set(items.map(item => item.remote_port_id)).size === items.length, 'mappings must be unique'),
    port_mode: z.enum(['access', 'trunk']), access_vlan: z.number().int().min(1).max(4094).nullable(), native_vlan: z.number().int().min(1).max(4094).nullable(), tagged_vlans: z.array(z.number().int().min(1).max(4094)
    )
  }).optional()
}).superRefine((value, ctx) => {
  if (value.sync && new Set(value.sync.mappings.map(m => m.local_port_id)).size !== value.port_ids.length) ctx.addIssue({ code: 'custom', path: ['sync', 'mappings'], message: 'mappings must cover all port_ids' })
})

export const updateLagGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  port_ids: z.array(z.string()).min(2).refine(ids => new Set(ids).size === ids.length, 'port_ids must be distinct').optional(),
  remote_device: z.string().max(200).optional().nullable(),
  remote_device_id: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  sync: z.object({
    remote_switch_id: z.string().min(1),
    mappings: z.array(z.object({ local_port_id: z.string().min(1), remote_port_id: z.string().min(1) }))
      .min(2).refine(items => new Set(items.map(item => item.local_port_id)).size === items.length, 'local mappings must be distinct')
      .refine(items => new Set(items.map(item => item.remote_port_id)).size === items.length, 'remote mappings must be distinct'),
    port_mode: z.enum(['access', 'trunk']),
    access_vlan: z.number().int().min(1).max(4094).nullable(),
    native_vlan: z.number().int().min(1).max(4094).nullable(),
    tagged_vlans: z.array(z.number().int().min(1).max(4094))
  }).optional()
}).superRefine((value, ctx) => {
  if (value.sync && value.port_ids && new Set(value.sync.mappings.map(m => m.local_port_id)).size !== value.port_ids.length) ctx.addIssue({ code: 'custom', path: ['sync', 'mappings'], message: 'mappings must cover all port_ids' })
})

export const deleteLagGroupSchema = z.object({ delete_remote: z.boolean().optional().default(false) }).strict()
