import { createHash, randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../db/client'
import type { Network } from '../../types/network'
import { isValidCIDR, isValidIPv4, isIPInSubnet, canonicalizeCIDR } from '../utils/ipv4'
import { slugify, resolveSlugCollision } from '../utils/slugify'
import { resolveSiteIdToUuid } from '../utils/resolveSiteParam'

interface NetworkRow {
  id: string
  site_id: string
  slug: string
  name: string
  vlan_id: string | null
  subnet: string
  gateway: string | null
  dns_servers: string
  description: string | null
  is_favorite: boolean
  exclude_from_utilization?: boolean
  created_at: string
  updated_at: string
}

function rowToNetwork(row: NetworkRow): Network {
  return {
    id: row.id,
    site_id: row.site_id,
    slug: row.slug,
    name: row.name,
    vlan_id: row.vlan_id ?? undefined,
    subnet: row.subnet,
    gateway: row.gateway ?? undefined,
    dns_servers: JSON.parse(row.dns_servers) as string[],
    description: row.description ?? undefined,
    is_favorite: row.is_favorite,
    exclude_from_utilization: row.exclude_from_utilization ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function validateNetworkInputs(data: { subnet?: string; gateway?: string | null; dns_servers?: string[] }, currentSubnet?: string) {
  if (data.subnet !== undefined && !isValidCIDR(data.subnet)) {
    throw createError({ statusCode: 400, message: 'Invalid CIDR notation' })
  }
  const subnet = data.subnet ?? currentSubnet
  if (data.gateway) {
    if (!isValidIPv4(data.gateway)) {
      throw createError({ statusCode: 400, message: 'Invalid gateway IP address' })
    }
    if (subnet && !isIPInSubnet(data.gateway, subnet)) {
      throw createError({ statusCode: 400, message: 'Gateway is not within the subnet' })
    }
  }
  if (data.dns_servers) {
    for (const dns of data.dns_servers) {
      if (!isValidIPv4(dns)) {
        throw createError({ statusCode: 400, message: `Invalid DNS server IP: ${dns}` })
      }
    }
  }
}

/** True when a (possibly Prisma/driver-wrapped) error carries a write-guard trigger token. */
export function hasConflictToken(err: unknown, token: 'NETWORK_SUBNET_CONFLICT' | 'IP_ALLOCATION_CONFLICT', depth = 0): boolean {
  if (err == null || depth > 5) return false
  if (typeof err === 'string') return err.includes(token)
  if (typeof err !== 'object') return false
  const e = err as { message?: unknown, meta?: unknown, cause?: unknown }
  if (typeof e.message === 'string' && e.message.includes(token)) return true
  if (e.meta && JSON.stringify(e.meta).includes(token)) return true
  return hasConflictToken(e.cause, token, depth + 1)
}

export function networkConflictError(name?: string) {
  return createError({
    statusCode: 409,
    message: name
      ? `A network with the same subnet already exists in this site and VLAN scope: ${name}`
      : 'A network with the same subnet already exists in this site and VLAN scope'
  })
}

/** Name of another network in the same (site, vlan-or-untagged) scope with the same canonical CIDR. */
export async function findScopedSubnetClash(
  siteId: string,
  vlanId: string | null,
  subnet: string,
  excludeId?: string,
  db: PrismaClient | Prisma.TransactionClient = prisma
): Promise<string | null> {
  if (!isValidCIDR(subnet)) return null
  const canon = canonicalizeCIDR(subnet)
  const candidates = await db.network.findMany({
    where: { site_id: siteId, vlan_id: vlanId, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { name: true, subnet: true }
  })
  return candidates.find(n => isValidCIDR(n.subnet) && canonicalizeCIDR(n.subnet) === canon)?.name ?? null
}

async function mapNetworkConflict<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (hasConflictToken(err, 'NETWORK_SUBNET_CONFLICT')) throw networkConflictError()
    throw err
  }
}

async function uniqueNetworkSlug(siteId: string, desired: string, excludeId?: string): Promise<string> {
  return resolveSlugCollision(desired, async (candidate) => {
    const found = await prisma.network.findUnique({
      where: { site_id_slug: { site_id: siteId, slug: candidate } }
    })
    if (!found) return false
    return excludeId !== found.id
  })
}

/** Everything a network delete removes, plus the port links it clears. */
export interface NetworkDeleteImpact {
  network: { id: string, site_id: string, slug: string, name: string, subnet: string, vlan_id: string | null }
  allocations: Array<{ id: string, ip_address: string, hostname: string | null }>
  ranges: Array<{ id: string, start_ip: string, end_ip: string, type: string }>
  /** Ports whose `connected_allocation_id` points at an allocation of this network. */
  ports: Array<{ id: string, switch_id: string, index: number, label: string | null, connected_allocation_id: string }>
}

export type NetworkDeleteOutcome =
  | { kind: 'not_found' }
  | { kind: 'conflict', impact: NetworkDeleteImpact, impactToken: string }
  | { kind: 'deleted', impact: NetworkDeleteImpact }

/**
 * Fingerprint over the affected rows (IDs and fields, not counts) so a changed
 * allocation/range/port set invalidates a previously previewed delete.
 */
export function networkImpactToken(impact: NetworkDeleteImpact): string {
  return createHash('sha256').update(JSON.stringify(impact)).digest('hex')
}

async function resolveNetworkRow(db: PrismaClient | Prisma.TransactionClient, identifier: string, siteId?: string) {
  if (siteId) {
    const scoped = await db.network.findUnique({ where: { site_id_slug: { site_id: siteId, slug: identifier } } })
    if (scoped) return scoped
  }
  const byId = await db.network.findUnique({ where: { id: identifier } })
  if (byId) return byId
  const matches = await db.network.findMany({ where: { slug: identifier } })
  return matches.length === 1 ? matches[0]! : null
}

async function buildDeleteImpact(db: PrismaClient | Prisma.TransactionClient, row: NetworkRow): Promise<NetworkDeleteImpact> {
  const [allocations, ranges] = await Promise.all([
    db.ipAllocation.findMany({
      where: { network_id: row.id },
      select: { id: true, ip_address: true, hostname: true },
      orderBy: { ip_address: 'asc' }
    }),
    db.ipRange.findMany({
      where: { network_id: row.id },
      select: { id: true, start_ip: true, end_ip: true, type: true },
      orderBy: { start_ip: 'asc' }
    })
  ])
  const ports = allocations.length
    ? await db.port.findMany({
      where: { connected_allocation_id: { in: allocations.map(a => a.id) } },
      select: { id: true, switch_id: true, index: true, label: true, connected_allocation_id: true },
      orderBy: [{ switch_id: 'asc' }, { index: 'asc' }]
    })
    : []
  return {
    network: { id: row.id, site_id: row.site_id, slug: row.slug, name: row.name, subnet: row.subnet, vlan_id: row.vlan_id },
    allocations,
    ranges,
    ports: ports as NetworkDeleteImpact['ports']
  }
}

export const networkRepository = {
  async list(siteId?: string): Promise<Network[]> {
    const rows = await prisma.network.findMany({
      where: siteId ? { site_id: siteId } : undefined,
      orderBy: [{ site_id: 'asc' }, { name: 'asc' }]
    })
    return rows.map(rowToNetwork)
  },

  /**
   * Lookup by primary key. Falls back to a *globally unique* slug match so
   * /sites/<slug>/subnets/<network-slug> works without an explicit site
   * context. Ambiguous slug (exists in multiple sites) → null; callers with
   * a known site should use `getBySlug(siteId, slug)`.
   */
  async getById(identifier: string): Promise<Network | null> {
    const byPk = await prisma.network.findUnique({ where: { id: identifier } })
    if (byPk) return rowToNetwork(byPk)
    const matches = await prisma.network.findMany({ where: { slug: identifier } })
    if (matches.length === 1) return rowToNetwork(matches[0]!)
    return null
  },

  async getBySlug(siteId: string, slug: string): Promise<Network | null> {
    const row = await prisma.network.findUnique({ where: { site_id_slug: { site_id: siteId, slug } } })
    return row ? rowToNetwork(row) : null
  },

  /**
   * Lookup by UUID or `site_slug:network_slug`. Falls back to UUID-only when the
   * caller hasn't yet adapted to the new slug format.
   */
  async getByIdOrSlug(identifier: string, siteId?: string): Promise<Network | null> {
    // When a site is known, try the per-site slug first — that disambiguates
    // the case where the same slug exists on multiple sites (per-site unique,
    // not globally), which would otherwise make `getById` return null.
    if (siteId) {
      const scoped = await this.getBySlug(siteId, identifier)
      if (scoped) return scoped
    }
    return this.getById(identifier)
  },

  async create(data: Omit<Network, 'id' | 'slug' | 'created_at' | 'updated_at' | 'is_favorite' | 'exclude_from_utilization'> & { slug?: string; exclude_from_utilization?: boolean }): Promise<Network> {
    validateNetworkInputs(data)
    // `site_id` from the request body may arrive as a UUID *or* a slug since
    // the URL-driven create forms use slug-shaped route params.
    const siteUuid = await resolveSiteIdToUuid(data.site_id)
    const subnet = canonicalizeCIDR(data.subnet)
    const clashName = await findScopedSubnetClash(siteUuid, data.vlan_id ?? null, subnet)
    if (clashName) throw networkConflictError(clashName)
    const desired = data.slug ? slugify(data.slug) : slugify(data.name)
    const slug = await uniqueNetworkSlug(siteUuid, desired)

    const now = new Date().toISOString()
    const row = await mapNetworkConflict(() => prisma.network.create({
      data: {
        id: randomUUID(),
        site_id: siteUuid,
        slug,
        name: data.name,
        vlan_id: data.vlan_id ?? null,
        subnet,
        gateway: data.gateway ?? null,
        dns_servers: JSON.stringify(data.dns_servers ?? []),
        description: data.description ?? null,
        is_favorite: false,
        exclude_from_utilization: data.exclude_from_utilization ?? false,
        created_at: now,
        updated_at: now
      }
    }))
    return rowToNetwork(row)
  },

  async update(idOrSlug: string, data: Partial<Omit<Network, 'id' | 'created_at'>>, siteId?: string): Promise<Network> {
    // Accept either a UUID or a slug. When a site is known, try the per-site
    // slug first so callers on /sites/<site>/subnets/<slug> can resolve even
    // when the slug isn't globally unique.
    let current = null
    if (siteId) {
      current = await prisma.network.findUnique({
        where: { site_id_slug: { site_id: siteId, slug: idOrSlug } }
      })
    }
    if (!current) current = await prisma.network.findUnique({ where: { id: idOrSlug } })
    if (!current) {
      const matches = await prisma.network.findMany({ where: { slug: idOrSlug } })
      if (matches.length === 1) current = matches[0]!
    }
    if (!current) {
      throw createError({ statusCode: 404, message: 'Network not found' })
    }
    const id = current.id

    validateNetworkInputs(data, current.subnet)

    const nextSubnet = data.subnet !== undefined ? canonicalizeCIDR(data.subnet) : undefined
    const nextVlan = data.vlan_id !== undefined ? (data.vlan_id ?? null) : current.vlan_id
    const keyChanged = nextVlan !== current.vlan_id
      || (nextSubnet !== undefined && (!isValidCIDR(current.subnet) || canonicalizeCIDR(current.subnet) !== nextSubnet))
    if (keyChanged) {
      const clashName = await findScopedSubnetClash(current.site_id, nextVlan, nextSubnet ?? current.subnet, id)
      if (clashName) throw networkConflictError(clashName)
    }

    // Slug resolution: see siteRepository.update for the full rationale.
    let slug: string | undefined
    if (data.slug !== undefined && data.slug !== current.slug) {
      slug = await uniqueNetworkSlug(current.site_id, slugify(data.slug), id)
    } else if (data.name !== undefined && data.name !== current.name) {
      slug = await uniqueNetworkSlug(current.site_id, slugify(data.name), id)
    }

    const row = await mapNetworkConflict(() => prisma.network.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.vlan_id !== undefined ? { vlan_id: data.vlan_id ?? null } : {}),
        ...(nextSubnet !== undefined ? { subnet: nextSubnet } : {}),
        ...(data.gateway !== undefined ? { gateway: data.gateway ?? null } : {}),
        ...(data.dns_servers !== undefined ? { dns_servers: JSON.stringify(data.dns_servers) } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.is_favorite !== undefined ? { is_favorite: data.is_favorite } : {}),
        ...(data.exclude_from_utilization !== undefined ? { exclude_from_utilization: data.exclude_from_utilization } : {}),
        ...(slug !== undefined ? { slug } : {}),
        updated_at: new Date().toISOString()
      }
    }))
    return rowToNetwork(row)
  },

  /** Non-destructive preview of what deleting this network removes or clears. */
  async getDeleteImpact(idOrSlug: string, siteId?: string): Promise<NetworkDeleteImpact | null> {
    const row = await resolveNetworkRow(prisma, idOrSlug, siteId)
    return row ? buildDeleteImpact(prisma, row) : null
  },

  /**
   * Atomic network delete. The impact is re-read and re-fingerprinted inside the
   * same transaction, so a state change between preview and execution yields
   * `conflict` without mutating anything. Omit `expectedImpactToken` for the
   * legacy JWT path (no precondition); API-token callers must pass it.
   */
  async deleteGuarded(idOrSlug: string, siteId?: string, expectedImpactToken?: string): Promise<NetworkDeleteOutcome> {
    return prisma.$transaction(async (tx) => {
      const row = await resolveNetworkRow(tx, idOrSlug, siteId)
      if (!row) return { kind: 'not_found' }
      const impact = await buildDeleteImpact(tx, row)
      const impactToken = networkImpactToken(impact)
      if (expectedImpactToken !== undefined && expectedImpactToken !== impactToken) {
        return { kind: 'conflict', impact, impactToken }
      }
      await tx.ipAllocation.deleteMany({ where: { network_id: row.id } })
      await tx.ipRange.deleteMany({ where: { network_id: row.id } })
      // deleteMany: a concurrently deleted target is a clean not_found, not a P2025 500.
      const removed = await tx.network.deleteMany({ where: { id: row.id } })
      if (removed.count === 0) return { kind: 'not_found' }
      return { kind: 'deleted', impact }
    })
  },

  async delete(idOrSlug: string, siteId?: string): Promise<boolean> {
    const current = await resolveNetworkRow(prisma, idOrSlug, siteId)
    if (!current) return false
    try {
      // Cascades to IpAllocation + IpRange via Prisma schema (onDelete: Cascade).
      await prisma.network.delete({ where: { id: current.id } })
      return true
    } catch {
      return false
    }
  }
}
