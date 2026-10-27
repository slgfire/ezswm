import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db/client'
import type { ActivityEntry } from '../../types/activity'
import { activityRepository } from './activityRepository'
import {
  findScopedSubnetClash,
  networkImpactToken,
  networkRepository,
  type NetworkDeleteImpact
} from './networkRepository'
import { vlanImpactToken, vlanRepository, type VlanDeleteImpact } from './vlanRepository'
import { ipAllocationImpactToken, ipAllocationRepository, type IpAllocationDeleteImpact } from './ipAllocationRepository'
import { ipRangeImpactToken, ipRangeRepository, type IpRangeDeleteImpact } from './ipRangeRepository'
import { assertDeviceTypeAssignable } from './customDeviceTypeRepository'
import {
  canonicalizeCIDR, doRangesOverlap, ipToLong, isIPInSubnet, isUsableHostIP, isValidCIDR, isValidIPv4, isValidMacAddress
} from '../utils/ipv4'

/**
 * API-token safe undo contract (plan A7). Only create (→ A5 guarded delete) and
 * update (→ validated snapshot restore) are exposed. Delete undo is unsupported:
 * real delete routes do not log previous_state and a recreated row could not
 * restore cascaded children / links. Switch/patch panel/site delete, layout
 * templates, imports, categories and credentials stay unsupported.
 */
const SUPPORTED: Record<string, ReadonlySet<string>> = {
  site: new Set(['update']),
  vlan: new Set(['create', 'update']),
  network: new Set(['create', 'update']),
  ip_allocation: new Set(['create', 'update']),
  ip_range: new Set(['create', 'update'])
}

const INVERTIBLE_ACTIONS = new Set(['create', 'update'])

const optStr = z.string().nullish()
const snapshotSchemas: Record<string, z.ZodType<Record<string, unknown>>> = {
  site: z.object({ name: z.string().min(1), slug: z.string().min(1), description: optStr }),
  vlan: z.object({
    site_id: z.string().min(1),
    vlan_id: z.number().int().min(1).max(4094),
    name: z.string().min(1),
    description: optStr,
    status: z.enum(['active', 'inactive']),
    routing_device: optStr,
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    is_favorite: z.boolean()
  }),
  network: z.object({
    site_id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
    vlan_id: optStr,
    subnet: z.string().refine(isValidCIDR, 'Invalid CIDR'),
    gateway: optStr,
    dns_servers: z.array(z.string()),
    description: optStr,
    is_favorite: z.boolean(),
    exclude_from_utilization: z.boolean()
  }),
  ip_allocation: z.object({
    network_id: z.string().min(1),
    ip_address: z.string().refine(isValidIPv4, 'Invalid IPv4'),
    hostname: optStr,
    mac_address: optStr,
    device_type: optStr,
    description: optStr,
    status: z.string().min(1)
  }),
  ip_range: z.object({
    network_id: z.string().min(1),
    start_ip: z.string().refine(isValidIPv4, 'Invalid IPv4'),
    end_ip: z.string().refine(isValidIPv4, 'Invalid IPv4'),
    type: z.string().min(1),
    description: optStr
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod-validated snapshot, per-entity shape
type Snapshot = Record<string, any>

function parseSnapshot(entityType: string, prev: Record<string, unknown> | undefined): { ok: true, data: Snapshot } | { ok: false, reason: string } {
  const schema = snapshotSchemas[entityType]
  if (!prev || !schema) return { ok: false, reason: 'No previous_state snapshot is available for this entry' }
  const parsed = schema.safeParse(prev)
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, reason: 'The previous_state snapshot is malformed or incomplete' }
}

/** True when the entry carries a snapshot that passes per-entity validation. */
export function hasValidSnapshot(entityType: string, prev: Record<string, unknown> | undefined): boolean {
  return parseSnapshot(entityType, prev).ok
}

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
  code?: 'target_missing'
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

export function describeUndo(action: string, entityType: string, hasSnapshot = true): { undoable: boolean, reason?: string, inverse?: string } {
  if (action === 'delete') {
    return { undoable: false, reason: 'Undo of a delete is not supported: delete activity does not record a restorable snapshot of the row and its dependents' }
  }
  if (!INVERTIBLE_ACTIONS.has(action)) {
    return { undoable: false, reason: `Action "${action}" is not invertible in the safe undo contract` }
  }
  if (entityType === 'site' && action !== 'update') {
    return { undoable: false, reason: 'Undoing a site create would delete the site, which is forbidden for API tokens' }
  }
  if (!SUPPORTED[entityType]?.has(action)) {
    return {
      undoable: false,
      reason: `Undo of "${action}" on "${entityType}" is not supported by the safe contract (v1)`
    }
  }
  if (action === 'update' && !hasSnapshot) {
    return { undoable: false, reason: 'No valid previous_state snapshot is available for this entry' }
  }
  const inverse = action === 'create'
    ? `delete the created ${entityType} row (A5 impact preview applies)`
    : 'restore the previous state snapshot'
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
  const described = describeUndo(entry.action, entry.entity_type, hasValidSnapshot(entry.entity_type, entry.previous_state))
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

    if (entry.action === 'create') {
      const impact = await currentImpact(entry.entity_type, entry.entity_id)
      if (!impact) {
        return { ...preview, undoable: false, code: 'target_missing', reason: 'The target row no longer exists; there is nothing to undo' }
      }
      const impactToken = impactTokenFor(entry.entity_type, impact)
      return {
        ...preview,
        impact,
        impactToken,
        undoToken: stateToken(entry, { deletedImpactToken: impactToken })
      }
    }

    const target = await readTarget(prisma, entry.entity_type, entry.entity_id)
    return { ...preview, undoToken: stateToken(entry, target) }
  },

  async execute(id: string, expectedUndoToken: string): Promise<UndoOutcome> {
    const entry = await activityRepository.getById(id)
    if (!entry) return { kind: 'not_found' }
    const preview = previewOf(entry)
    if (!preview.undoable) return { kind: 'unsupported', reason: preview.reason ?? 'Not undoable' }

    // create → delete: reuse the A5 guarded delete, which re-reads and
    // re-fingerprints inside its own transaction.
    if (entry.action === 'create') {
      const fresh = await activityUndoRepository.getPreview(id)
      if (!fresh?.undoable) return { kind: 'conflict', preview: fresh ?? { ...preview, undoable: false, reason: 'Not undoable' } }
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

    // update → restore. Token check, invariant checks and the write share one
    // transaction; any thrown 409 rolls back everything.
    const outcome = await prisma.$transaction(async (tx) => {
      const row = await tx.activityEntry.findUnique({ where: { id } })
      if (!row) return { kind: 'not_found' as const }
      const previous = parseJson(row.previous_state)
      const snapshot = parseSnapshot(entry.entity_type, previous)
      if (!snapshot.ok) return { kind: 'unsupported' as const, reason: snapshot.reason }
      const target = await readTarget(tx, entry.entity_type, entry.entity_id)
      const token = stateToken({ ...entry, previous_state: previous }, target)
      if (token !== expectedUndoToken) {
        return { kind: 'conflict' as const, preview: { ...preview, undoToken: token } }
      }
      if (!target) {
        return { kind: 'conflict' as const, preview: { ...preview, undoable: false, reason: 'The target row no longer exists' } }
      }
      await updateEntity(tx, entry.entity_type, entry.entity_id, snapshot.data, target as Snapshot)
      return { kind: 'undone' as const }
    })

    if (outcome.kind === 'undone') return { kind: 'undone', entry, inverse: preview.inverse ?? 'restore' }
    return outcome
  }
}

function parseJson(raw: string | null): Record<string, unknown> | undefined {
  if (!raw) return undefined
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : undefined
  } catch {
    return undefined
  }
}

const conflict = (message: string) => createError({ statusCode: 409, message })

/** Re-applies the same invariants the regular update routes enforce, inside the caller's transaction. */
async function updateEntity(tx: Prisma.TransactionClient, entityType: string, id: string, prev: Snapshot, cur: Snapshot) {
  const now = new Date().toISOString()
  switch (entityType) {
    case 'site': {
      const taken = await tx.site.findFirst({ where: { slug: prev.slug, NOT: { id } }, select: { id: true } })
      if (taken) throw conflict(`Site slug "${prev.slug}" is already used by another site`)
      await tx.site.update({
        where: { id },
        data: { name: prev.name, slug: prev.slug, description: prev.description ?? null, updated_at: now }
      })
      return
    }
    case 'vlan': {
      if (prev.site_id !== cur.site_id) throw conflict('The snapshot belongs to a different site')
      const tag = await tx.vlan.findFirst({ where: { site_id: cur.site_id, vlan_id: prev.vlan_id, NOT: { id } }, select: { id: true } })
      if (tag) throw conflict(`VLAN ID ${prev.vlan_id} already exists in this site`)
      const color = await tx.vlan.findFirst({ where: { site_id: cur.site_id, color: prev.color, NOT: { id } }, select: { id: true } })
      if (color) throw conflict(`Color ${prev.color} is already used by another VLAN in this site`)
      await tx.vlan.update({
        where: { id },
        data: {
          vlan_id: prev.vlan_id,
          name: prev.name,
          description: prev.description ?? null,
          status: prev.status,
          routing_device: prev.routing_device ?? null,
          color: prev.color,
          is_favorite: prev.is_favorite,
          updated_at: now
        }
      })
      return
    }
    case 'network': {
      if (prev.site_id !== cur.site_id) throw conflict('The snapshot belongs to a different site')
      const subnet = canonicalizeCIDR(prev.subnet)
      const vlanId: string | null = prev.vlan_id ?? null
      if (prev.gateway && (!isValidIPv4(prev.gateway) || !isIPInSubnet(prev.gateway, subnet))) {
        throw conflict('The snapshot gateway is not within its subnet')
      }
      if (prev.dns_servers.some((d: string) => !isValidIPv4(d))) throw conflict('The snapshot contains an invalid DNS server')
      if (vlanId) {
        const vlan = await tx.vlan.findUnique({ where: { id: vlanId }, select: { site_id: true } })
        if (!vlan || vlan.site_id !== cur.site_id) throw conflict('The VLAN referenced by the snapshot no longer exists in this site')
      }
      const clash = await findScopedSubnetClash(cur.site_id, vlanId, subnet, id, tx)
      if (clash) throw conflict(`A network with this subnet already exists in the same scope: ${clash}`)
      const slugTaken = await tx.network.findFirst({ where: { site_id: cur.site_id, slug: prev.slug, NOT: { id } }, select: { id: true } })
      if (slugTaken) throw conflict(`Network slug "${prev.slug}" is already used in this site`)
      await tx.network.update({
        where: { id },
        data: {
          slug: prev.slug,
          name: prev.name,
          vlan_id: vlanId,
          subnet,
          gateway: prev.gateway ?? null,
          dns_servers: JSON.stringify(prev.dns_servers),
          description: prev.description ?? null,
          is_favorite: prev.is_favorite,
          exclude_from_utilization: prev.exclude_from_utilization,
          updated_at: now
        }
      })
      return
    }
    case 'ip_allocation': {
      const [curNet, net] = await Promise.all([
        tx.network.findUnique({ where: { id: cur.network_id }, select: { site_id: true } }),
        tx.network.findUnique({ where: { id: prev.network_id }, select: { id: true, site_id: true, subnet: true } })
      ])
      if (!net || !curNet || net.site_id !== curNet.site_id) throw conflict('The network referenced by the snapshot no longer exists in this site')
      if (!isUsableHostIP(prev.ip_address, net.subnet)) throw conflict(`IP ${prev.ip_address} is not a usable host address of ${net.subnet}`)
      if (prev.mac_address && !isValidMacAddress(prev.mac_address)) throw conflict('The snapshot contains an invalid MAC address')
      const ipLong = ipToLong(prev.ip_address)
      const dhcp = await tx.ipRange.findMany({ where: { network_id: net.id, type: 'dhcp' } })
      if (dhcp.some(r => ipLong >= ipToLong(r.start_ip) && ipLong <= ipToLong(r.end_ip))) {
        throw conflict(`IP ${prev.ip_address} is inside a DHCP dynamic range`)
      }
      const taken = await tx.ipAllocation.findFirst({ where: { network_id: net.id, ip_address: prev.ip_address, NOT: { id } }, select: { id: true } })
      if (taken) throw conflict(`IP address ${prev.ip_address} is already allocated`)
      if (prev.device_type && prev.device_type !== cur.device_type) {
        await assertDeviceTypeAssignable(prev.device_type, { client: tx })
      }
      await tx.ipAllocation.update({
        where: { id },
        data: {
          network_id: net.id,
          ip_address: prev.ip_address,
          hostname: prev.hostname ?? null,
          mac_address: prev.mac_address ?? null,
          device_type: prev.device_type ?? null,
          description: prev.description ?? null,
          status: prev.status,
          updated_at: now
        }
      })
      return
    }
    case 'ip_range': {
      if (prev.network_id !== cur.network_id) throw conflict('The snapshot belongs to a different network')
      const net = await tx.network.findUnique({ where: { id: cur.network_id }, select: { subnet: true } })
      if (!net) throw conflict('The network no longer exists')
      if (ipToLong(prev.start_ip) > ipToLong(prev.end_ip)) throw conflict('Snapshot start IP is greater than end IP')
      if (!isIPInSubnet(prev.start_ip, net.subnet) || !isIPInSubnet(prev.end_ip, net.subnet)) {
        throw conflict(`The snapshot range is outside the network subnet ${net.subnet}`)
      }
      const others = await tx.ipRange.findMany({ where: { network_id: cur.network_id, NOT: { id } } })
      const overlap = others.find(r => doRangesOverlap(prev.start_ip, prev.end_ip, r.start_ip, r.end_ip))
      if (overlap) throw conflict(`Range ${prev.start_ip}-${prev.end_ip} overlaps with existing range ${overlap.start_ip}-${overlap.end_ip}`)
      await tx.ipRange.update({
        where: { id },
        data: {
          start_ip: prev.start_ip,
          end_ip: prev.end_ip,
          type: prev.type,
          description: prev.description ?? null,
          updated_at: now
        }
      })
      return
    }
    default:
      throw createError({ statusCode: 422, message: `Undo update not supported for "${entityType}"` })
  }
}
