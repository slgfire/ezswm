import { prisma } from '../../../db/client'
import { activityRepository } from '../../../repositories/activityRepository'
import { siteRepository } from '../../../repositories/siteRepository'
import { vlanRepository } from '../../../repositories/vlanRepository'
import { networkRepository } from '../../../repositories/networkRepository'
import { ipAllocationRepository } from '../../../repositories/ipAllocationRepository'
import { ipRangeRepository } from '../../../repositories/ipRangeRepository'
import { layoutTemplateRepository } from '../../../repositories/layoutTemplateRepository'

// Activity undo dispatches on (action, entity_type). The previous_state snapshot
// is the entity's pre-change shape (TypeScript interface form), so we route it
// through the matching repository method to get back to a valid DB row.
//
// Supported in 0.21.3:
//   - action=create on simple entities  → repo.delete
//   - action=update on simple entities  → repo.update(previous_state)
//   - action=delete on simple entities  → repo.create(previous_state)
//
// Simple entities = site, vlan, network, ip_allocation, ip_range. Switch and
// layout_template have embedded children that need a more careful snapshot
// translation; they intentionally return 422 with a clear message instead of
// half-restoring.

const SIMPLE_ENTITIES = new Set(['site', 'vlan', 'network', 'ip_allocation', 'ip_range'])

type PrevState = Record<string, unknown>

async function deleteEntity(entity_type: string, entity_id: string): Promise<void> {
  switch (entity_type) {
    case 'site':           await siteRepository.delete(entity_id); break
    case 'vlan':           await vlanRepository.delete(entity_id); break
    case 'network':        await networkRepository.delete(entity_id); break
    case 'ip_allocation':  await ipAllocationRepository.delete(entity_id); break
    case 'ip_range':       await ipRangeRepository.delete(entity_id); break
    case 'layout_template': await layoutTemplateRepository.delete(entity_id); break
    default:
      throw createError({ statusCode: 422, message: `Undo not supported for entity_type "${entity_type}".` })
  }
}

async function updateEntity(entity_type: string, entity_id: string, prev: PrevState): Promise<void> {
  // Strip immutable fields from the patch.
  const patch = { ...prev }
  delete patch.id
  delete patch.created_at

  switch (entity_type) {
    case 'site':
      await siteRepository.update(entity_id, patch as Parameters<typeof siteRepository.update>[1])
      break
    case 'vlan':
      await vlanRepository.update(entity_id, patch as Parameters<typeof vlanRepository.update>[1])
      break
    case 'network':
      await networkRepository.update(entity_id, patch as Parameters<typeof networkRepository.update>[1])
      break
    case 'ip_allocation':
      await ipAllocationRepository.update(entity_id, patch as Parameters<typeof ipAllocationRepository.update>[1])
      break
    case 'ip_range':
      await ipRangeRepository.update(entity_id, patch as Parameters<typeof ipRangeRepository.update>[1])
      break
    default:
      throw createError({ statusCode: 422, message: `Undo on update not supported for entity_type "${entity_type}".` })
  }
}

async function recreateEntity(entity_type: string, prev: PrevState): Promise<void> {
  // For re-insert we keep the original ID so cross-references in other tables
  // (and in activity logs) still resolve.
  switch (entity_type) {
    case 'site':
      await prisma.site.create({
        data: {
          id: String(prev.id),
          slug: String(prev.slug ?? `restored-${String(prev.id).slice(0, 6)}`),
          name: String(prev.name),
          description: (prev.description as string | null) ?? null,
          created_at: String(prev.created_at),
          updated_at: new Date().toISOString()
        }
      })
      break
    case 'vlan':
      await prisma.vlan.create({
        data: {
          id: String(prev.id),
          site_id: String(prev.site_id),
          vlan_id: Number(prev.vlan_id),
          name: String(prev.name),
          description: (prev.description as string | null) ?? null,
          status: String(prev.status),
          routing_device: (prev.routing_device as string | null) ?? null,
          color: String(prev.color),
          is_favorite: Boolean(prev.is_favorite),
          created_at: String(prev.created_at),
          updated_at: new Date().toISOString()
        }
      })
      break
    case 'network':
      await prisma.network.create({
        data: {
          id: String(prev.id),
          site_id: String(prev.site_id),
          slug: String(prev.slug ?? `restored-${String(prev.id).slice(0, 6)}`),
          name: String(prev.name),
          vlan_id: (prev.vlan_id as string | null) ?? null,
          subnet: String(prev.subnet),
          gateway: (prev.gateway as string | null) ?? null,
          dns_servers: JSON.stringify(prev.dns_servers ?? []),
          description: (prev.description as string | null) ?? null,
          is_favorite: Boolean(prev.is_favorite),
          created_at: String(prev.created_at),
          updated_at: new Date().toISOString()
        }
      })
      break
    case 'ip_allocation':
      await prisma.ipAllocation.create({
        data: {
          id: String(prev.id),
          network_id: String(prev.network_id),
          ip_address: String(prev.ip_address),
          hostname: (prev.hostname as string | null) ?? null,
          mac_address: (prev.mac_address as string | null) ?? null,
          device_type: (prev.device_type as string | null) ?? null,
          description: (prev.description as string | null) ?? null,
          status: String(prev.status),
          created_at: String(prev.created_at),
          updated_at: new Date().toISOString()
        }
      })
      break
    case 'ip_range':
      await prisma.ipRange.create({
        data: {
          id: String(prev.id),
          network_id: String(prev.network_id),
          start_ip: String(prev.start_ip),
          end_ip: String(prev.end_ip),
          type: String(prev.type),
          description: (prev.description as string | null) ?? null,
          created_at: String(prev.created_at),
          updated_at: new Date().toISOString()
        }
      })
      break
    default:
      throw createError({ statusCode: 422, message: `Undo on delete not supported for entity_type "${entity_type}".` })
  }
}

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Activity ID required' })

  const entry = await activityRepository.getById(id)
  if (!entry) throw createError({ statusCode: 404, message: 'Activity entry not found' })

  const action = entry.action
  const entity_type = entry.entity_type

  if (action === 'duplicate' || action === 'update_port' || action === 'bulk_update_ports'
      || action === 'add_configured_vlans' || action === 'remove_configured_vlans') {
    throw createError({
      statusCode: 422,
      message: `Undo for action "${action}" is not yet supported (tracked separately).`
    })
  }

  if (action !== 'create' && !entry.previous_state) {
    throw createError({ statusCode: 400, message: 'No previous_state available for undo.' })
  }

  if (!SIMPLE_ENTITIES.has(entity_type) && entity_type !== 'layout_template') {
    throw createError({
      statusCode: 422,
      message: `Undo not yet supported for entity_type "${entity_type}". Supported: ${[...SIMPLE_ENTITIES].join(', ')}.`
    })
  }

  try {
    if (action === 'create') {
      await deleteEntity(entity_type, entry.entity_id)
    } else if (action === 'update') {
      await updateEntity(entity_type, entry.entity_id, entry.previous_state!)
    } else if (action === 'delete') {
      await recreateEntity(entity_type, entry.previous_state!)
    } else {
      throw createError({ statusCode: 422, message: `Unsupported action "${action}".` })
    }

    // Log the undo itself so it shows up in the audit trail.
    await activityRepository.log({
      user_id: event.context.auth.userId,
      action: 'update',
      entity_type,
      entity_id: entry.entity_id,
      entity_name: entry.entity_name,
      metadata: { undid_entry_id: entry.id, undone_action: action }
    }).catch(() => { /* best-effort */ })

    return { success: true, action, entity_type, entity_id: entry.entity_id }
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode) throw err
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 500, message: `Undo failed: ${message}` })
  }
})
