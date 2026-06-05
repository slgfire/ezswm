import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { Network } from '../../types/network'
import { isValidCIDR, isValidIPv4, isIPInSubnet } from '../utils/ipv4'
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

async function uniqueNetworkSlug(siteId: string, desired: string, excludeId?: string): Promise<string> {
  return resolveSlugCollision(desired, async (candidate) => {
    const found = await prisma.network.findUnique({
      where: { site_id_slug: { site_id: siteId, slug: candidate } }
    })
    if (!found) return false
    return excludeId !== found.id
  })
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

  async create(data: Omit<Network, 'id' | 'slug' | 'created_at' | 'updated_at' | 'is_favorite'> & { slug?: string }): Promise<Network> {
    validateNetworkInputs(data)
    // `site_id` from the request body may arrive as a UUID *or* a slug since
    // the URL-driven create forms use slug-shaped route params.
    const siteUuid = await resolveSiteIdToUuid(data.site_id)
    const desired = data.slug ? slugify(data.slug) : slugify(data.name)
    const slug = await uniqueNetworkSlug(siteUuid, desired)

    const now = new Date().toISOString()
    const row = await prisma.network.create({
      data: {
        id: randomUUID(),
        site_id: siteUuid,
        slug,
        name: data.name,
        vlan_id: data.vlan_id ?? null,
        subnet: data.subnet,
        gateway: data.gateway ?? null,
        dns_servers: JSON.stringify(data.dns_servers ?? []),
        description: data.description ?? null,
        is_favorite: false,
        created_at: now,
        updated_at: now
      }
    })
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

    // Slug resolution: see siteRepository.update for the full rationale.
    let slug: string | undefined
    if (data.slug !== undefined && data.slug !== current.slug) {
      slug = await uniqueNetworkSlug(current.site_id, slugify(data.slug), id)
    } else if (data.name !== undefined && data.name !== current.name) {
      slug = await uniqueNetworkSlug(current.site_id, slugify(data.name), id)
    }

    const row = await prisma.network.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.vlan_id !== undefined ? { vlan_id: data.vlan_id ?? null } : {}),
        ...(data.subnet !== undefined ? { subnet: data.subnet } : {}),
        ...(data.gateway !== undefined ? { gateway: data.gateway ?? null } : {}),
        ...(data.dns_servers !== undefined ? { dns_servers: JSON.stringify(data.dns_servers) } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.is_favorite !== undefined ? { is_favorite: data.is_favorite } : {}),
        ...(slug !== undefined ? { slug } : {}),
        updated_at: new Date().toISOString()
      }
    })
    return rowToNetwork(row)
  },

  async delete(idOrSlug: string, siteId?: string): Promise<boolean> {
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
