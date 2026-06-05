import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { Site } from '../../types/site'
import { slugify, resolveSlugCollision } from '../utils/slugify'

interface SiteRow {
  id: string
  slug: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

function rowToSite(row: SiteRow): Site {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

async function uniqueSiteSlug(desired: string, excludeId?: string): Promise<string> {
  return resolveSlugCollision(desired, async (candidate) => {
    const found = await prisma.site.findUnique({ where: { slug: candidate } })
    if (!found) return false
    return excludeId !== found.id
  })
}

export const siteRepository = {
  async list(): Promise<Site[]> {
    const rows = await prisma.site.findMany({ orderBy: { name: 'asc' } })
    return rows.map(rowToSite)
  },

  /**
   * Lookup by primary key. `/api/sites/:identifier` routes pass whatever URL
   * segment they got — that may be a UUID or a slug — so this falls back to a
   * slug lookup. Site slugs are globally unique, so the fallback is unambiguous.
   */
  async getById(identifier: string): Promise<Site | null> {
    const byId = await prisma.site.findUnique({ where: { id: identifier } })
    if (byId) return rowToSite(byId)
    const bySlug = await prisma.site.findUnique({ where: { slug: identifier } })
    return bySlug ? rowToSite(bySlug) : null
  },

  async getBySlug(slug: string): Promise<Site | null> {
    const row = await prisma.site.findUnique({ where: { slug } })
    return row ? rowToSite(row) : null
  },

  async create(data: Omit<Site, 'id' | 'slug' | 'created_at' | 'updated_at'> & { slug?: string }): Promise<Site> {
    const now = new Date().toISOString()
    const desired = data.slug ? slugify(data.slug) : slugify(data.name)
    const slug = await uniqueSiteSlug(desired)
    const row = await prisma.site.create({
      data: {
        id: randomUUID(),
        slug,
        name: data.name,
        description: data.description ?? null,
        created_at: now,
        updated_at: now
      }
    })
    return rowToSite(row)
  },

  async update(idOrSlug: string, data: Partial<Omit<Site, 'id' | 'created_at'>>): Promise<Site> {
    // Accept either a UUID or a slug — the rest of the function uses the
    // canonical UUID so the Prisma `where: { id }` clause works.
    const existing = (await prisma.site.findUnique({ where: { id: idOrSlug } }))
      ?? (await prisma.site.findUnique({ where: { slug: idOrSlug } }))
    if (!existing) {
      throw createError({ statusCode: 404, message: 'Site not found' })
    }
    const id = existing.id

    // Slug resolution:
    //  - If `slug` is explicitly set to a different value than the current one →
    //    treat as an explicit slug change (collision-resolved).
    //  - Else if the name changes → re-derive the slug from the new name so
    //    URLs stay in sync with what the operator sees in the UI.
    //  - Otherwise leave the slug alone.
    // The "different value" guard handles the common case where the edit form
    // happens to round-trip the current slug along with name/description.
    let slug: string | undefined
    if (data.slug !== undefined && data.slug !== existing.slug) {
      slug = await uniqueSiteSlug(slugify(data.slug), id)
    } else if (data.name !== undefined && data.name !== existing.name) {
      slug = await uniqueSiteSlug(slugify(data.name), id)
    }

    const row = await prisma.site.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(slug !== undefined ? { slug } : {}),
        updated_at: new Date().toISOString()
      }
    })
    return rowToSite(row)
  },

  async delete(idOrSlug: string): Promise<boolean> {
    const existing = (await prisma.site.findUnique({ where: { id: idOrSlug } }))
      ?? (await prisma.site.findUnique({ where: { slug: idOrSlug } }))
    if (!existing) return false
    try {
      await prisma.site.delete({ where: { id: existing.id } })
      return true
    } catch {
      return false
    }
  },

  async getEntityCounts(siteId: string): Promise<{ switches: number; vlans: number; networks: number }> {
    const [switches, vlans, networks] = await Promise.all([
      prisma.switch.count({ where: { site_id: siteId } }),
      prisma.vlan.count({ where: { site_id: siteId } }),
      prisma.network.count({ where: { site_id: siteId } })
    ])
    return { switches, vlans, networks }
  },

  async hasEntities(siteId: string): Promise<boolean> {
    const counts = await this.getEntityCounts(siteId)
    return counts.switches > 0 || counts.vlans > 0 || counts.networks > 0
  }
}
