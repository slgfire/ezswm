import { randomUUID } from 'node:crypto'

import { prisma } from '../db/client'
import type { PatchPanel, PatchPanelSocket, PatchPanelPortCount, PatchPanelSocketSide } from '../../types/patchPanel'
import { resolveSiteIdToUuid } from '../utils/resolveSiteParam'
import { slugify, resolveSlugCollision } from '../utils/slugify'

interface PatchPanelSocketRow {
  id: string
  patch_panel_id: string
  port_number: number
  side: string | null
  outlet_number: string | null
  location: string | null
  tested: boolean
  created_at: string
  updated_at: string
}

interface PatchPanelRow {
  id: string
  site_id: string
  slug: string
  name: string
  description: string | null
  port_count: number
  created_at: string
  updated_at: string
  sockets?: PatchPanelSocketRow[]
}

const includeSockets = {
  sockets: {
    orderBy: [{ port_number: 'asc' as const }]
  }
}

function rowToSocket(row: PatchPanelSocketRow): PatchPanelSocket {
  return {
    id: row.id,
    patch_panel_id: row.patch_panel_id,
    port_number: row.port_number,
    side: row.side ? row.side as PatchPanelSocketSide : undefined,
    outlet_number: row.outlet_number ?? undefined,
    location: row.location ?? undefined,
    tested: row.tested,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function rowToPatchPanel(row: PatchPanelRow): PatchPanel {
  return {
    id: row.id,
    site_id: row.site_id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    port_count: row.port_count as PatchPanelPortCount,
    sockets: (row.sockets ?? []).map(rowToSocket),
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

async function uniquePatchPanelSlug(siteId: string, desired: string, excludeId?: string): Promise<string> {
  return resolveSlugCollision(desired, async (candidate) => {
    const found = await prisma.patchPanel.findUnique({
      where: { site_id_slug: { site_id: siteId, slug: candidate } }
    })
    if (!found) return false
    return excludeId !== found.id
  })
}

export const patchPanelRepository = {
  async list(siteId?: string): Promise<PatchPanel[]> {
    const rows = await prisma.patchPanel.findMany({
      where: siteId ? { site_id: siteId } : undefined,
      include: includeSockets,
      orderBy: [{ site_id: 'asc' }, { name: 'asc' }]
    })
    return rows.map(rowToPatchPanel)
  },

  async getById(identifier: string): Promise<PatchPanel | null> {
    const byId = await prisma.patchPanel.findUnique({ where: { id: identifier }, include: includeSockets })
    if (byId) return rowToPatchPanel(byId)
    const matches = await prisma.patchPanel.findMany({ where: { slug: identifier }, include: includeSockets })
    if (matches.length === 1) return rowToPatchPanel(matches[0]!)
    return null
  },

  async getBySlug(siteId: string, slug: string): Promise<PatchPanel | null> {
    const row = await prisma.patchPanel.findUnique({
      where: { site_id_slug: { site_id: siteId, slug } },
      include: includeSockets
    })
    return row ? rowToPatchPanel(row) : null
  },

  async getByIdOrSlug(identifier: string, siteId?: string): Promise<PatchPanel | null> {
    if (siteId) {
      const scoped = await this.getBySlug(siteId, identifier)
      if (scoped) return scoped
    }
    return this.getById(identifier)
  },

  async create(data: {
    site_id: string
    name: string
    description?: string
    port_count: PatchPanelPortCount
    slug?: string
  }): Promise<PatchPanel> {
    const siteUuid = await resolveSiteIdToUuid(data.site_id)
    const desiredSlug = data.slug ? slugify(data.slug) : slugify(data.name)
    const slug = await uniquePatchPanelSlug(siteUuid, desiredSlug)
    const now = new Date().toISOString()
    const panelId = randomUUID()

    const sockets = [] as Array<{
      id: string
      patch_panel_id: string
      port_number: number
      side: null
      outlet_number: null
      location: null
      tested: false
      created_at: string
      updated_at: string
    }>
    for (let port = 1; port <= data.port_count; port++) {
      sockets.push({
        id: randomUUID(),
        patch_panel_id: panelId,
        port_number: port,
        side: null,
        outlet_number: null,
        location: null,
        tested: false,
        created_at: now,
        updated_at: now
      })
    }

    return await prisma.$transaction(async (tx) => {
      await tx.patchPanel.create({
        data: {
          id: panelId,
          site_id: siteUuid,
          slug,
          name: data.name,
          description: data.description ?? null,
          port_count: data.port_count,
          created_at: now,
          updated_at: now
        }
      })
      await tx.patchPanelSocket.createMany({ data: sockets })
      const row = await tx.patchPanel.findUniqueOrThrow({ where: { id: panelId }, include: includeSockets })
      return rowToPatchPanel(row)
    })
  },

  async update(idOrSlug: string, data: { name?: string; description?: string | null; slug?: string }, siteId?: string): Promise<PatchPanel> {
    let current = null
    if (siteId) {
      current = await prisma.patchPanel.findUnique({
        where: { site_id_slug: { site_id: siteId, slug: idOrSlug } },
        include: includeSockets
      })
    }
    if (!current) current = await prisma.patchPanel.findUnique({ where: { id: idOrSlug }, include: includeSockets })
    if (!current) {
      const matches = await prisma.patchPanel.findMany({ where: { slug: idOrSlug }, include: includeSockets })
      if (matches.length === 1) current = matches[0]!
    }
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Patch panel not found' })

    let slug: string | undefined
    if (data.slug !== undefined && data.slug !== current.slug) {
      slug = await uniquePatchPanelSlug(current.site_id, slugify(data.slug), current.id)
    } else if (data.name !== undefined && data.name !== current.name) {
      slug = await uniquePatchPanelSlug(current.site_id, slugify(data.name), current.id)
    }

    const row = await prisma.patchPanel.update({
      where: { id: current.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(slug !== undefined ? { slug } : {}),
        updated_at: new Date().toISOString()
      },
      include: includeSockets
    })
    return rowToPatchPanel(row)
  },

  async delete(idOrSlug: string, siteId?: string): Promise<boolean> {
    let current = null
    if (siteId) {
      current = await prisma.patchPanel.findUnique({ where: { site_id_slug: { site_id: siteId, slug: idOrSlug } } })
    }
    if (!current) current = await prisma.patchPanel.findUnique({ where: { id: idOrSlug } })
    if (!current) {
      const matches = await prisma.patchPanel.findMany({ where: { slug: idOrSlug } })
      if (matches.length === 1) current = matches[0]!
    }
    if (!current) return false
    await prisma.patchPanel.delete({ where: { id: current.id } })
    return true
  },

  async updateSocket(panelId: string, socketId: string, data: { side?: PatchPanelSocketSide | null; outlet_number?: string | null; location?: string | null; tested?: boolean }): Promise<PatchPanelSocket> {
    const current = await prisma.patchPanelSocket.findUnique({ where: { id: socketId } })
    if (!current || current.patch_panel_id !== panelId) {
      throw createError({ statusCode: 404, statusMessage: 'Patch panel socket not found' })
    }

    const row = await prisma.patchPanelSocket.update({
      where: { id: socketId },
      data: {
        ...(data.side !== undefined ? { side: data.side ?? null } : {}),
        ...(data.outlet_number !== undefined ? { outlet_number: data.outlet_number ?? null } : {}),
        ...(data.location !== undefined ? { location: data.location ?? null } : {}),
        ...(data.tested !== undefined ? { tested: data.tested } : {}),
        updated_at: new Date().toISOString()
      }
    })
    return rowToSocket(row)
  }
}
