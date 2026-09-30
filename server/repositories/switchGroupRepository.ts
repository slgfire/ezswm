import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { SwitchGroup } from '../../types/switchGroup'
import { slugify, resolveSlugCollision } from '../utils/slugify'
import { resolveSiteIdToUuid } from '../utils/resolveSiteParam'

interface SwitchGroupRow {
  id: string
  site_id: string
  slug: string
  name: string
  sort_order: number | null
  created_at: string
  updated_at: string
}

function rowToSwitchGroup(row: SwitchGroupRow): SwitchGroup {
  return {
    id: row.id,
    site_id: row.site_id,
    slug: row.slug,
    name: row.name,
    sort_order: row.sort_order ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

async function uniqueGroupSlug(siteId: string, desired: string, excludeId?: string): Promise<string> {
  return resolveSlugCollision(desired, async (candidate) => {
    const found = await prisma.switchGroup.findUnique({
      where: { site_id_slug: { site_id: siteId, slug: candidate } }
    })
    if (!found) return false
    return excludeId !== found.id
  })
}

async function nextSortOrder(siteId: string): Promise<number> {
  const max = await prisma.switchGroup.aggregate({
    where: { site_id: siteId },
    _max: { sort_order: true }
  })
  return (max._max.sort_order ?? -1) + 1
}

export const switchGroupRepository = {
  async list(siteId?: string): Promise<SwitchGroup[]> {
    const rows = await prisma.switchGroup.findMany({
      where: siteId ? { site_id: siteId } : undefined,
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }]
    })
    return rows.map(rowToSwitchGroup)
  },

  async getById(identifier: string): Promise<SwitchGroup | null> {
    const byPk = await prisma.switchGroup.findUnique({ where: { id: identifier } })
    if (byPk) return rowToSwitchGroup(byPk)
    const matches = await prisma.switchGroup.findMany({ where: { slug: identifier } })
    if (matches.length === 1) return rowToSwitchGroup(matches[0]!)
    return null
  },

  async getBySlug(siteId: string, slug: string): Promise<SwitchGroup | null> {
    const row = await prisma.switchGroup.findUnique({ where: { site_id_slug: { site_id: siteId, slug } } })
    return row ? rowToSwitchGroup(row) : null
  },

  async getByIdOrSlug(identifier: string, siteId?: string): Promise<SwitchGroup | null> {
    if (siteId) {
      const scoped = await this.getBySlug(siteId, identifier)
      if (scoped) return scoped
    }
    return this.getById(identifier)
  },

  async create(data: Omit<SwitchGroup, 'id' | 'slug' | 'created_at' | 'updated_at'> & { slug?: string }): Promise<SwitchGroup> {
    const siteUuid = await resolveSiteIdToUuid(data.site_id)

    const nameClash = await prisma.switchGroup.findFirst({
      where: { site_id: siteUuid, name: data.name }
    })
    if (nameClash) {
      throw createError({ statusCode: 409, message: `Switch group name '${data.name}' already exists in this site` })
    }

    const desiredSlug = data.slug ? slugify(data.slug) : slugify(data.name)
    const slug = await uniqueGroupSlug(siteUuid, desiredSlug)
    const now = new Date().toISOString()

    try {
      const row = await prisma.switchGroup.create({
        data: {
          id: randomUUID(),
          site_id: siteUuid,
          slug,
          name: data.name,
          sort_order: data.sort_order ?? await nextSortOrder(siteUuid),
          created_at: now,
          updated_at: now
        }
      })

      return rowToSwitchGroup(row)
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw createError({ statusCode: 409, message: `Switch group name '${data.name}' already exists in this site` })
      }
      throw error
    }
  },

  async update(idOrSlug: string, data: Partial<Omit<SwitchGroup, 'id' | 'created_at'>>, siteId?: string): Promise<SwitchGroup> {
    let current = null
    if (siteId) {
      current = await prisma.switchGroup.findUnique({ where: { site_id_slug: { site_id: siteId, slug: idOrSlug } } })
    }
    if (!current) current = await prisma.switchGroup.findUnique({ where: { id: idOrSlug } })
    if (!current) {
      const matches = await prisma.switchGroup.findMany({ where: { slug: idOrSlug } })
      if (matches.length === 1) current = matches[0]!
    }
    if (!current) {
      throw createError({ statusCode: 404, message: 'Switch group not found' })
    }

    const targetSiteId = data.site_id !== undefined
      ? await resolveSiteIdToUuid(data.site_id)
      : current.site_id

    const nextName = data.name ?? current.name
    if (nextName !== current.name || targetSiteId !== current.site_id) {
      const clash = await prisma.switchGroup.findFirst({
        where: { site_id: targetSiteId, name: nextName, NOT: { id: current.id } }
      })
      if (clash) {
        throw createError({ statusCode: 409, message: `Switch group name '${nextName}' already exists in this site` })
      }
    }

    let slug: string | undefined
    if (data.slug !== undefined && data.slug !== current.slug) {
      slug = await uniqueGroupSlug(targetSiteId, slugify(data.slug), current.id)
    } else if ((data.name !== undefined && data.name !== current.name) || (data.site_id !== undefined && targetSiteId !== current.site_id)) {
      slug = await uniqueGroupSlug(targetSiteId, slugify(nextName), current.id)
    }

    try {
      const row = await prisma.switchGroup.update({
        where: { id: current.id },
        data: {
          ...(data.site_id !== undefined ? { site_id: targetSiteId } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.sort_order !== undefined ? { sort_order: data.sort_order ?? null } : {}),
          ...(slug !== undefined ? { slug } : {}),
          updated_at: new Date().toISOString()
        }
      })
      return rowToSwitchGroup(row)
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw createError({ statusCode: 409, message: `Switch group name '${nextName}' already exists in this site` })
      }
      throw error
    }
  },

  async updateSortOrder(order: string[]): Promise<void> {
    if (order.length === 0) return

    const rows = await prisma.switchGroup.findMany({
      where: { id: { in: order } },
      select: { id: true, site_id: true }
    })

    if (rows.length !== order.length) {
      throw createError({ statusCode: 404, message: 'Switch group not found in sort order payload' })
    }

    const sites = new Set(rows.map(row => row.site_id))
    if (sites.size > 1) {
      throw createError({ statusCode: 422, message: 'Switch groups from different sites cannot be sorted together' })
    }

    await prisma.$transaction(
      order.map((id, i) => prisma.switchGroup.update({ where: { id }, data: { sort_order: i } }))
    )
  },

  async delete(idOrSlug: string, siteId?: string): Promise<boolean> {
    const current = await this.getByIdOrSlug(idOrSlug, siteId)
    if (!current) return false
    await prisma.switchGroup.delete({ where: { id: current.id } })
    return true
  }
}
