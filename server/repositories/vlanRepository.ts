import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { VLAN } from '../../types/vlan'
import { VLAN_COLOR_POOL } from '../../types/vlan'
import { canonicalizeCIDR, isValidCIDR } from '../utils/ipv4'
import { hasConflictToken } from './networkRepository'
import { resolveSiteIdToUuid } from '../utils/resolveSiteParam'
import { deleteImpactToken, type DeleteOutcome } from '../utils/deleteImpact'
import type { Prisma, PrismaClient } from '@prisma/client'

interface VlanRow {
  id: string
  site_id: string
  vlan_id: number
  name: string
  description: string | null
  status: string
  routing_device: string | null
  color: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}

function rowToVlan(row: VlanRow): VLAN {
  return {
    id: row.id,
    site_id: row.site_id,
    vlan_id: row.vlan_id,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status as VLAN['status'],
    routing_device: row.routing_device ?? undefined,
    color: row.color,
    is_favorite: row.is_favorite,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}


export interface VlanDeleteConflict { id: string, name: string, subnet: string }

/** What a VLAN delete changes: networks are untagged (FK SetNull); conflicts block it. */
export interface VlanDeleteImpact {
  vlan: { id: string, site_id: string, vlan_id: number, name: string }
  networks: Array<{ id: string, name: string, subnet: string, site_id: string }>
  /** Networks whose CIDR would collide in the untagged scope; non-empty means deletion is blocked. */
  conflicts: VlanDeleteConflict[]
}

export function vlanImpactToken(impact: VlanDeleteImpact): string {
  return deleteImpactToken(impact)
}

/**
 * Re-derives the untagged-scope CIDR guard (mirrors the DB write guard). Kept in
 * one place so preview and execution cannot disagree.
 */
async function findVlanDeleteConflicts(db: PrismaClient | Prisma.TransactionClient, id: string, own: Array<{ id: string, name: string, subnet: string, site_id: string }>) {
  const conflicts: VlanDeleteConflict[] = []
  if (own.length === 0) return conflicts
  const untagged = await db.network.findMany({
    where: { site_id: { in: [...new Set(own.map(n => n.site_id))] }, vlan_id: null },
    select: { id: true, name: true, subnet: true, site_id: true }
  })
  const seen = new Map<string, string>()
  for (const n of untagged) if (isValidCIDR(n.subnet)) seen.set(`${n.site_id}\u0000${canonicalizeCIDR(n.subnet)}`, n.id)
  for (const n of own) {
    if (!isValidCIDR(n.subnet)) continue
    const key = `${n.site_id}\u0000${canonicalizeCIDR(n.subnet)}`
    if (seen.has(key)) {
      if (conflicts.length < 5) conflicts.push({ id: n.id, name: n.name.slice(0, 80), subnet: n.subnet })
    } else {
      seen.set(key, n.id)
    }
  }
  return conflicts
}

async function buildVlanDeleteImpact(db: PrismaClient | Prisma.TransactionClient, id: string): Promise<VlanDeleteImpact | null> {
  const vlan = await db.vlan.findUnique({ where: { id }, select: { id: true, site_id: true, vlan_id: true, name: true } })
  if (!vlan) return null
  const networks = await db.network.findMany({
    where: { vlan_id: id },
    select: { id: true, name: true, subnet: true, site_id: true },
    orderBy: { name: 'asc' }
  })
  return { vlan, networks, conflicts: await findVlanDeleteConflicts(db, id, networks) }
}

export const vlanRepository = {
  async list(siteId?: string): Promise<VLAN[]> {
    const rows = await prisma.vlan.findMany({
      where: siteId ? { site_id: siteId } : undefined,
      orderBy: [{ site_id: 'asc' }, { vlan_id: 'asc' }]
    })
    return rows.map(rowToVlan)
  },

  async getById(id: string): Promise<VLAN | null> {
    const row = await prisma.vlan.findUnique({ where: { id } })
    return row ? rowToVlan(row) : null
  },

  async getNextAvailableColor(siteId?: string): Promise<string | null> {
    const rows = await prisma.vlan.findMany({
      where: siteId ? { site_id: siteId } : undefined,
      select: { color: true }
    })
    const usedColors = new Set(rows.map(r => r.color))
    return VLAN_COLOR_POOL.find(c => !usedColors.has(c)) ?? null
  },

  async create(data: Omit<VLAN, 'id' | 'created_at' | 'updated_at' | 'is_favorite'>): Promise<VLAN> {
    // site_id from the body may be UUID or slug — resolve to canonical UUID.
    const siteUuid = await resolveSiteIdToUuid(data.site_id)

    const tagClash = await prisma.vlan.findFirst({
      where: { site_id: siteUuid, vlan_id: data.vlan_id }
    })
    if (tagClash) {
      throw createError({ statusCode: 409, message: `VLAN ID ${data.vlan_id} already exists in this site` })
    }
    const colorClash = await prisma.vlan.findFirst({
      where: { site_id: siteUuid, color: data.color }
    })
    if (colorClash) {
      throw createError({ statusCode: 409, message: `Color ${data.color} is already used by another VLAN in this site` })
    }

    const now = new Date().toISOString()
    const row = await prisma.vlan.create({
      data: {
        id: randomUUID(),
        site_id: siteUuid,
        vlan_id: data.vlan_id,
        name: data.name,
        description: data.description ?? null,
        status: data.status,
        routing_device: data.routing_device ?? null,
        color: data.color,
        is_favorite: false,
        created_at: now,
        updated_at: now
      }
    })
    return rowToVlan(row)
  },

  async update(id: string, data: Partial<Omit<VLAN, 'id' | 'created_at'>>): Promise<VLAN> {
    const current = await prisma.vlan.findUnique({ where: { id } })
    if (!current) {
      throw createError({ statusCode: 404, message: 'VLAN not found' })
    }

    if (data.vlan_id !== undefined && data.vlan_id !== current.vlan_id) {
      const clash = await prisma.vlan.findFirst({
        where: { site_id: current.site_id, vlan_id: data.vlan_id, NOT: { id } }
      })
      if (clash) {
        throw createError({ statusCode: 409, message: `VLAN ID ${data.vlan_id} already exists in this site` })
      }
    }
    if (data.color !== undefined && data.color !== current.color) {
      const clash = await prisma.vlan.findFirst({
        where: { site_id: current.site_id, color: data.color, NOT: { id } }
      })
      if (clash) {
        throw createError({ statusCode: 409, message: `Color ${data.color} is already used by another VLAN in this site` })
      }
    }

    const row = await prisma.vlan.update({
      where: { id },
      data: {
        ...(data.vlan_id !== undefined ? { vlan_id: data.vlan_id } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.routing_device !== undefined ? { routing_device: data.routing_device ?? null } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.is_favorite !== undefined ? { is_favorite: data.is_favorite } : {}),
        updated_at: new Date().toISOString()
      }
    })
    return rowToVlan(row)
  },

  /** Deleting a VLAN untags its networks (FK SET NULL); refuse when that would duplicate an untagged CIDR. */
  async delete(id: string): Promise<boolean> {
    const vlan = await prisma.vlan.findUnique({ where: { id } })
    if (!vlan) return false

    const conflicts = await findVlanDeleteConflicts(prisma, id, await prisma.network.findMany({
      where: { vlan_id: id },
      select: { id: true, name: true, subnet: true, site_id: true }
    }))
    if (conflicts.length > 0) {
      throw createError({
        statusCode: 409,
        message: 'Deleting this VLAN would make network subnets duplicate within the untagged scope of the site',
        data: { code: 'VLAN_NETWORK_SUBNET_CONFLICT', conflicts }
      })
    }

    try {
      await prisma.vlan.delete({ where: { id } })
      return true
    } catch (err) {
      if (hasConflictToken(err, 'NETWORK_SUBNET_CONFLICT')) {
        throw createError({
          statusCode: 409,
          message: 'Deleting this VLAN would make network subnets duplicate within the untagged scope of the site',
          data: { code: 'VLAN_NETWORK_SUBNET_CONFLICT', conflicts: [] }
        })
      }
      if ((err as { code?: string })?.code === 'P2025') return false
      throw err
    }
  },

  /** Preview of the networks a delete untags, plus blocking conflicts. */
  async getDeleteImpact(id: string): Promise<VlanDeleteImpact | null> {
    return buildVlanDeleteImpact(prisma, id)
  },

  /**
   * Atomic VLAN delete sharing the untagged-scope guard with `delete()`. A blocked
   * state throws the existing 409 and mutates nothing. Omit `expectedImpactToken`
   * for JWT/UI.
   */
  async deleteGuarded(id: string, expectedImpactToken?: string): Promise<DeleteOutcome<VlanDeleteImpact>> {
    return prisma.$transaction(async (tx) => {
      const impact = await buildVlanDeleteImpact(tx, id)
      if (!impact) return { kind: 'not_found' }
      const impactToken = vlanImpactToken(impact)
      if (expectedImpactToken !== undefined && expectedImpactToken !== impactToken) {
        return { kind: 'conflict', impact, impactToken }
      }
      if (impact.conflicts.length > 0) {
        throw createError({
          statusCode: 409,
          message: 'Deleting this VLAN would make network subnets duplicate within the untagged scope of the site',
          data: { code: 'VLAN_NETWORK_SUBNET_CONFLICT', conflicts: impact.conflicts }
        })
      }
      await tx.vlan.delete({ where: { id } })
      return { kind: 'deleted', impact }
    })
  }

}
