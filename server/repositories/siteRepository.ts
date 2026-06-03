import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { Site } from '../../types/site'

interface SiteRow {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

function rowToSite(row: SiteRow): Site {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export const siteRepository = {
  async list(): Promise<Site[]> {
    const rows = await prisma.site.findMany({ orderBy: { name: 'asc' } })
    return rows.map(rowToSite)
  },

  async getById(id: string): Promise<Site | null> {
    const row = await prisma.site.findUnique({ where: { id } })
    return row ? rowToSite(row) : null
  },

  async create(data: Omit<Site, 'id' | 'created_at' | 'updated_at'>): Promise<Site> {
    const now = new Date().toISOString()
    const row = await prisma.site.create({
      data: {
        id: randomUUID(),
        name: data.name,
        description: data.description ?? null,
        created_at: now,
        updated_at: now
      }
    })
    return rowToSite(row)
  },

  async update(id: string, data: Partial<Omit<Site, 'id' | 'created_at'>>): Promise<Site> {
    const existing = await prisma.site.findUnique({ where: { id } })
    if (!existing) {
      throw createError({ statusCode: 404, message: 'Site not found' })
    }
    const row = await prisma.site.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        updated_at: new Date().toISOString()
      }
    })
    return rowToSite(row)
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.site.delete({ where: { id } })
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
