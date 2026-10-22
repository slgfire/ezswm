import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db/client'
import type { ActivityEntry } from '../../types/activity'
import { activityRepository } from './activityRepository'
import {
  findScopedSubnetClash,
  hasConflictToken,
  networkImpactToken,
  networkRepository,
  type NetworkDeleteImpact
} from './networkRepository'
import { vlanImpactToken, vlanRepository, type VlanDeleteImpact } from './vlanRepository'
import { ipAllocationImpactToken, ipAllocationRepository, type IpAllocationDeleteImpact } from './ipAllocationRepository'
import { ipRangeImpactToken, ipRangeRepository, type IpRangeDeleteImpact } from './ipRangeRepository'
import { canonicalizeCIDR, isValidCIDR } from '../utils/ipv4'

/**
 * API-token safe undo contract (plan A7). Only actions whose inverse is either a
 * checked row update/recreate or an A5-guarded delete are exposed. Everything
 * else (switch/patch panel/site delete, layout templates, imports, categories,
 * credentials) stays unsupported: no activity snapshot or a destructive inverse
 * that is not allowed for API tokens.
 */
const SUPPORTED: Record<string, ReadonlySet<string>> = {
  site: new Set(['update']),
  vlan: new Set(['create', 'update', 'delete']),
  network: new Set(['create', 'update', 'delete']),
  ip_allocation: new Set(['create', 'update', 'delete']),
  ip_range: new Set(['create', 'update', 'delete'])
}

const INVERTIBLE_ACTIONS = new Set(['create', 'update', 'delete'])

export interface UndoPreview {
  entry: {
    id: string
    timestamp: string
    action: string
    entity_type: string
    entity_id: string
    entity_name: string
  }
  undoable: boolean
  reason?: string
  inverse?: string
  impact?: unknown
  impactToken?: string
  undoToken?: string
}

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function sanitize(entry: ActivityEntry): UndoPreview['entry'] {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    entity_name: entry.entity_name
  }
}

export function describeUndo(action: string, entityType: string): { undoable: boolean, reason?: string, inverse?: string } {
  if (!INVERTIBLE_ACTIONS.has(action)) {
    return { undoable: false, reason: `Action "${action}" is not invertible in the safe undo contract` }
  }
  if (entityType === 'site' && action !== 'update') {
    return {
      undoable: false,
      reason: action === 'create'
        ? 'Undoing a site create would delete the site, which is forbidden for API tokens'
        : 'Recreating a deleted site does not restore its cascaded data'
    }
  }
  if (!SUPPORTED[entityType]?.has(action)) {
    return {
      undoable: false,
      reason: `Undo of "${action}" on "${entityType}" is not supported by the safe contract (v1)`
    }
  }
  const inverse = action === 'create'
    ? `delete the created ${entityType} row (A5 impact preview applies)`
    : action === 'update'
      ? 'restore the previous state snapshot'
      : `recreate the deleted ${entityType} row`
  return { undoable: true, inverse }
}

type TargetRow = unknown

async function readTarget(db: Prisma.TransactionClient, entityType: string, id: string): Promise<TargetRow> {
  switch (entityType) {
    case 'site': return db.site.findUnique({ where: { id } })
    case 'vlan': return db.vlan.findUnique({ where: { id } })
    case 'network': return db.network.findUnique({ where: { id } })
    case 'ip_allocation': return db.ipAllocation.findUnique({ where: { id } })
    case 'ip_range': return db.ipRange.findUnique({ where: { id } })
    default: return null
  }
}

async function currentImpact(entityType: string, id: string): Promise<
  NetworkDeleteImpact | VlanDeleteImpact | IpAllocationDeleteImpact | IpRangeDeleteImpact | null
> {
  switch (entityType) {
    case 'network': return networkRepository.getDeleteImpact(id)
    case 'vlan': return vlanRepository.getDeleteImpact(id)
    case 'ip_allocation': return ipAllocationRepository.getDeleteImpact(id)
    case 'ip_range': return ipRangeRepository.getDeleteImpact(id)
    default: return null
  }
}

function impactTokenFor(
  entityType: string,
  impact: NetworkDeleteImpact | VlanDeleteImpact | IpAllocationDeleteImpact | IpRangeDeleteImpact
): string {
  switch (entityType) {
    case 'network': return networkImpactToken(impact as NetworkDeleteImpact)
    case 'vlan': return vlanImpactToken(impact as VlanDeleteImpact)
    case 'ip_allocation': return ipAllocationImpactToken(impact as IpAllocationDeleteImpact)
    case 'ip_range': return ipRangeImpactToken(impact as IpRangeDeleteImpact)
    default: throw createError({ statusCode: 422, message: `No delete guard for "${entityType}"` })
  }
}

function stateToken(
  entry: Pick<ActivityEntry, 'id' | 'action' | 'entity_type' | 'entity_id'> & { previous_state?: Record<string, unknown> },
  target: TargetRow | { deletedImpactToken: string }
): string {
  return hash({
    id: entry.id,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    previous_state: entry.previous_state ?? null,
    target
  })
}

async function guardedDelete(entityType: string, id: string, impactToken?: string) {
  switch (entityType) {
    case 'network': return networkRepository.deleteGuarded(id, undefined, impactToken)
    case 'vlan': return vlanRepository.deleteGuarded(id, impactToken)
    case 'ip_allocation': return ipAllocationRepository.deleteGuarded(id, impactToken)
    case 'ip_range': return ipRangeRepository.deleteGuarded(id, impactToken)
    default: throw createError({ statusCode: 422, message: `No safe delete for "${entityType}"` })
  }
}

function previewOf(entry: ActivityEntry, reason?: string): UndoPreview {
  const described = describeUndo(entry.action, entry.entity_type)
  return {
    entry: sanitize(entry),
    undoable: described.undoable,
    ...(described.undoable ? {} : { reason: reason ?? described.reason }),
    ...(described.inverse ? { inverse: described.inverse } : {})
  }
}

export type UndoOutcome =
  | { kind: 'not_found' }
  | { kind: 'unsupported', reason: string }
  | { kind: 'conflict', preview: UndoPreview }
  | { kind: 'undone', entry: ActivityEntry, inverse: string }

export const activityUndoRepository = {
  async getPreview(id: string): Promise<UndoPreview | null> {
    const entry = await activityRepository.getById(id)
    if (!entry) return null
    const preview = previewOf(entry)
    if (!preview.undoable) return preview
    if (entry.action !== 'create' && !entry.previous_state) {
      return { ...preview, undoable: false, reason: 'No previous_state snapshot is available for this entry' }
    }

    if (entry.action === 'create') {
      const impact = await currentImpact(entry.entity_type, entry.entity_id)
      if (!impact) {
        return { ...preview, undoable: false, reason: 'The target row no longer exists; there is nothing to undo' }
      }
      const impactToken = impactTokenFor(entry.entity_type, impact)
      return {
        ...preview,
        impact,
        impactToken,
        undoToken: stateToken(entry, { deletedImpactToken: impactToken })
      }
    }

    const target = entry.action === 'update'
      ? await readTarget(prisma, entry.entity_type, entry.entity_id)
      : null
    return { ...preview, undoToken: stateToken(entry, target) }
  },

  async execute(id: string, expectedUndoToken: string): Promise<UndoOutcome> {
    const entry = await activityRepository.getById(id)
    if (!entry) return { kind: 'not_found' }
    const preview = previewOf(entry)
    if (!preview.undoable) return { kind: 'unsupported', reason: preview.reason ?? 'Not undoable' }
    if (entry.action !== 'create' && !entry.previous_state) {
      return { kind: 'unsupported', reason: 'No previous_state snapshot is available for this entry' }
    }

    // create → delete: reuse the A5 guarded delete, which re-reads and
    // re-fingerprints inside its own transaction.
    if (entry.action === 'create') {
      const fresh = await activityUndoRepository.getPreview(id)
      if (!fresh?.undoable) return { kind: 'unsupported', reason: fresh?.reason ?? 'Not undoable' }
      if (fresh.undoToken !== expectedUndoToken) return { kind: 'conflict', preview: fresh }
      const outcome = await guardedDelete(entry.entity_type, entry.entity_id, fresh.impactToken)
      if (outcome.kind === 'not_found') {
        return { kind: 'conflict', preview: { ...fresh, undoable: false, reason: 'The target row no longer exists' } }
      }
      if (outcome.kind === 'conflict') {
        return { kind: 'conflict', preview: { ...preview, impact: outcome.impact, impactToken: outcome.impactToken, undoToken: stateToken(entry, { deletedImpactToken: outcome.impactToken }) } }
      }
      return { kind: 'undone', entry, inverse: preview.inverse ?? 'delete' }
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const row = await tx.activityEntry.findUnique({ where: { id } })
      if (!row) return { kind: 'not_found' as const }
      const previous = parseState(row.previous_state)
      const target = await readTarget(tx, entry.entity_type, entry.entity_id)
      const token = stateToken(entry, target)
      if (token !== expectedUndoToken) {
        return { kind: 'conflict' as const, preview: { ...preview, undoToken: token } }
      }
      if (entry.action === 'update') {
        if (!target) {
          return { kind: 'conflict' as const, preview: { ...preview, undoable: false, reason: 'The target row no longer exists' } }
        }
        await updateEntity(tx, entry.entity_type, entry.entity_id, previous)
      } else {
        if (target) {
          return { kind: 'conflict' as const, preview: { ...preview, undoable: false, reason: 'A row with this id already exists' } }
        }
        await recreateEntity(tx, entry.entity_type, previous)
      }
      return { kind: 'undone' as const }
    })

    if (outcome.kind === 'undone') return { kind: 'undone', entry, inverse: preview.inverse ?? 'restore' }
    return outcome
  }
}

function parseState(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function updateEntity(tx: Prisma.TransactionClient, entityType: string, id: string, prev: Record<string, unknown>) {
  const now = new Date().toISOString()
  switch (entityType) {
    case 'site':
      await tx.site.update({
        where: { id },
        data: {
          name: String(prev.name),
          slug: String(prev.slug),
          description: (prev.description as string | null) ?? null,
          updated_at: now
        }
      })
      return
    case 'vlan':
      await tx.vlan.update({
        where: { id },
        data: {
          site_id: String(prev.site_id),
          vlan_id: Number(prev.vlan_id),
          name: String(prev.name),
          description: (prev.description as string | null) ?? null,
          status: String(prev.status),
          routing_device: (prev.routing_device as string | null) ?? null,
          color: String(prev.color),
          is_favorite: Boolean(prev.is_favorite),
          updated_at: now
        }
      })
      return
    case 'network': {
      const rawSubnet = String(prev.subnet)
      const subnet = isValidCIDR(rawSubnet) ? canonicalizeCIDR(rawSubnet) : rawSubnet
      const siteId = String(prev.site_id)
      const vlanId = (prev.vlan_id as string | null) ?? null
      const clash = await findScopedSubnetClash(siteId, vlanId, subnet, id)
      if (clash) throw createError({ statusCode: 409, message: `A network with this subnet already exists in the same scope: ${clash}` })
      await tx.network.update({
        where: { id },
        data: {
          site_id: siteId,
          slug: String(prev.slug),
          name: String(prev.name),
          vlan_id: vlanId,
          subnet,
          gateway: (prev.gateway as string | null) ?? null,
          dns_servers: JSON.stringify(prev.dns_servers ?? []),
          description: (prev.description as string | null) ?? null,
          is_favorite: Boolean(prev.is_favorite),
          exclude_from_utilization: Boolean(prev.exclude_from_utilization),
          updated_at: now
        }
      })
      return
    }
    case 'ip_allocation': {
      const networkId = String(prev.network_id)
      const ip = String(prev.ip_address)
      const taken = await tx.ipAllocation.findFirst({
        where: { network_id: networkId, ip_address: ip, NOT: { id } }
      })
      if (taken) throw createError({ statusCode: 409, message: `IP address ${ip} is already allocated` })
      await tx.ipAllocation.update({
        where: { id },
        data: {
          network_id: networkId,
          ip_address: ip,
          hostname: (prev.hostname as string | null) ?? null,
          mac_address: (prev.mac_address as string | null) ?? null,
          device_type: (prev.device_type as string | null) ?? null,
          description: (prev.description as string | null) ?? null,
          status: String(prev.status),
          updated_at: now
        }
      })
      return
    }
    case 'ip_range':
      await tx.ipRange.update({
        where: { id },
        data: {
          network_id: String(prev.network_id),
          start_ip: String(prev.start_ip),
          end_ip: String(prev.end_ip),
          type: String(prev.type),
          description: (prev.description as string | null) ?? null,
          updated_at: now
        }
      })
      return
    default:
      throw createError({ statusCode: 422, message: `Undo update not supported for "${entityType}"` })
  }
}

async function recreateEntity(tx: Prisma.TransactionClient, entityType: string, prev: Record<string, unknown>) {
  const now = new Date().toISOString()
  const createdAt = prev.created_at ? String(prev.created_at) : now
  switch (entityType) {
    case 'vlan':
      await tx.vlan.create({
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
          created_at: createdAt,
          updated_at: now
        }
      })
      return
    case 'network': {
      const rawSubnet = String(prev.subnet)
      const subnet = isValidCIDR(rawSubnet) ? canonicalizeCIDR(rawSubnet) : rawSubnet
      const siteId = String(prev.site_id)
      const vlanId = (prev.vlan_id as string | null) ?? null
      const clash = await findScopedSubnetClash(siteId, vlanId, subnet)
      if (clash) throw createError({ statusCode: 409, message: `A network with this subnet already exists in the same scope: ${clash}` })
      await tx.network.create({
        data: {
          id: String(prev.id),
          site_id: siteId,
          slug: String(prev.slug),
          name: String(prev.name),
          vlan_id: vlanId,
          subnet,
          gateway: (prev.gateway as string | null) ?? null,
          dns_servers: JSON.stringify(prev.dns_servers ?? []),
          description: (prev.description as string | null) ?? null,
          is_favorite: Boolean(prev.is_favorite),
          exclude_from_utilization: Boolean(prev.exclude_from_utilization),
          created_at: createdAt,
          updated_at: now
        }
      })
      return
    }
    case 'ip_allocation': {
      const networkId = String(prev.network_id)
      const ip = String(prev.ip_address)
      const taken = await tx.ipAllocation.findFirst({ where: { network_id: networkId, ip_address: ip } })
      if (taken) throw createError({ statusCode: 409, message: `IP address ${ip} is already allocated` })
      await tx.ipAllocation.create({
        data: {
          id: String(prev.id),
          network_id: networkId,
          ip_address: ip,
          hostname: (prev.hostname as string | null) ?? null,
          mac_address: (prev.mac_address as string | null) ?? null,
          device_type: (prev.device_type as string | null) ?? null,
          description: (prev.description as string | null) ?? null,
          status: String(prev.status),
          created_at: createdAt,
          updated_at: now
        }
      })
      return
    }
    case 'ip_range':
      await tx.ipRange.create({
        data: {
          id: String(prev.id),
          network_id: String(prev.network_id),
          start_ip: String(prev.start_ip),
          end_ip: String(prev.end_ip),
          type: String(prev.type),
          description: (prev.description as string | null) ?? null,
          created_at: createdAt,
          updated_at: now
        }
      })
      return
    default:
      throw createError({ statusCode: 422, message: `Undo delete not supported for "${entityType}"` })
  }
}

export { hasConflictToken }
