import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { LAGGroup } from '../../types/lagGroup'

interface LagRow {
  id: string
  switch_id: string
  name: string
  remote_device: string | null
  remote_device_id: string | null
  description: string | null
  created_at: string
  updated_at: string
}

async function rowToLag(row: LagRow): Promise<LAGGroup> {
  const portRows = await prisma.port.findMany({
    where: { lag_group_id: row.id },
    select: { id: true },
    orderBy: [{ unit: 'asc' }, { index: 'asc' }]
  })
  return {
    id: row.id,
    switch_id: row.switch_id,
    name: row.name,
    port_ids: portRows.map(p => p.id),
    remote_device: row.remote_device ?? undefined,
    remote_device_id: row.remote_device_id ?? undefined,
    description: row.description ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

async function rowsToLags(rows: LagRow[]): Promise<LAGGroup[]> {
  return Promise.all(rows.map(rowToLag))
}

export const lagGroupRepository = {
  async list(switchId?: string): Promise<LAGGroup[]> {
    const rows = await prisma.lagGroup.findMany({
      where: switchId ? { switch_id: switchId } : undefined,
      orderBy: [{ switch_id: 'asc' }, { name: 'asc' }]
    })
    return rowsToLags(rows)
  },

  async getById(id: string): Promise<LAGGroup | null> {
    const row = await prisma.lagGroup.findUnique({ where: { id } })
    return row ? rowToLag(row) : null
  },

  async create(idOrSlug: string, data: Omit<LAGGroup, 'id' | 'switch_id' | 'created_at' | 'updated_at'>): Promise<LAGGroup> {
    // Accept either a UUID or a globally-unique slug (the detail page passes the
    // route slug). Resolve to the real PK before any `where: { id }` use.
    let sw = await prisma.switch.findUnique({
      where: { id: idOrSlug },
      include: { ports: { select: { id: true, lag_group_id: true } } }
    })
    if (!sw) {
      const matches = await prisma.switch.findMany({
        where: { slug: idOrSlug },
        include: { ports: { select: { id: true, lag_group_id: true } } }
      })
      if (matches.length === 1) sw = matches[0]!
    }
    if (!sw) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }
    const switchId = sw.id

    const portIdSet = new Set(sw.ports.map(p => p.id))
    for (const portId of data.port_ids) {
      if (!portIdSet.has(portId)) {
        throw createError({ statusCode: 400, message: `Port ${portId} does not belong to switch ${sw.name}` })
      }
    }
    for (const portId of data.port_ids) {
      const port = sw.ports.find(p => p.id === portId)
      if (port?.lag_group_id) {
        const lag = await prisma.lagGroup.findUnique({ where: { id: port.lag_group_id }, select: { name: true } })
        throw createError({ statusCode: 409, message: `Port is already in LAG group '${lag?.name ?? port.lag_group_id}'` })
      }
    }

    const now = new Date().toISOString()
    const newId = randomUUID()

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.lagGroup.create({
        data: {
          id: newId,
          switch_id: switchId,
          name: data.name,
          remote_device: data.remote_device ?? null,
          remote_device_id: data.remote_device_id ?? null,
          description: data.description ?? null,
          created_at: now,
          updated_at: now
        }
      })
      if (data.port_ids.length > 0) {
        await tx.port.updateMany({
          where: { id: { in: data.port_ids } },
          data: { lag_group_id: newId }
        })
      }
      return created
    })

    return rowToLag(row)
  },

  async update(id: string, data: Partial<Omit<LAGGroup, 'id' | 'switch_id' | 'created_at'>>): Promise<LAGGroup> {
    const current = await prisma.lagGroup.findUnique({ where: { id } })
    if (!current) {
      throw createError({ statusCode: 404, message: 'LAG group not found' })
    }

    if (data.port_ids) {
      const sw = await prisma.switch.findUnique({
        where: { id: current.switch_id },
        include: { ports: { select: { id: true } } }
      })
      if (!sw) {
        throw createError({ statusCode: 404, message: 'Switch not found' })
      }
      const portIdSet = new Set(sw.ports.map(p => p.id))
      for (const portId of data.port_ids) {
        if (!portIdSet.has(portId)) {
          throw createError({ statusCode: 400, message: `Port ${portId} does not belong to switch` })
        }
      }
    }

    const updatedAt = new Date().toISOString()
    const row = await prisma.$transaction(async (tx) => {
      if (data.port_ids) {
        // Detach all currently-assigned ports for this lag.
        await tx.port.updateMany({
          where: { lag_group_id: id, NOT: { id: { in: data.port_ids } } },
          data: { lag_group_id: null }
        })
        // Attach the new set.
        if (data.port_ids.length > 0) {
          await tx.port.updateMany({
            where: { id: { in: data.port_ids } },
            data: { lag_group_id: id }
          })
        }
      }
      return tx.lagGroup.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.remote_device !== undefined ? { remote_device: data.remote_device ?? null } : {}),
          ...(data.remote_device_id !== undefined ? { remote_device_id: data.remote_device_id ?? null } : {}),
          ...(data.description !== undefined ? { description: data.description ?? null } : {}),
          updated_at: updatedAt
        }
      })
    })

    return rowToLag(row)
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        // Sever the inter-switch links of the member ports on BOTH ends, then
        // delete the group. Without this the cross-connections survive a LAG
        // delete (the peer keeps pointing back). Port.lag_group_id is cleared by
        // the schema's onDelete: SetNull.
        const members = await tx.port.findMany({
          where: { lag_group_id: id },
          select: { id: true, connected_port_id: true }
        })
        for (const m of members) {
          if (m.connected_port_id) {
            await tx.port.update({
              where: { id: m.connected_port_id },
              data: { connected_device: null, connected_device_id: null, connected_port_id: null, connected_port: null }
            }).catch(() => { /* peer port may not exist anymore */ })
          }
        }
        await tx.port.updateMany({
          where: { lag_group_id: id },
          data: { connected_device: null, connected_device_id: null, connected_port_id: null, connected_port: null }
        })
        await tx.lagGroup.delete({ where: { id } })
      })
      return true
    } catch {
      return false
    }
  },

  async deleteBySwitchId(switchId: string): Promise<number> {
    const result = await prisma.lagGroup.deleteMany({ where: { switch_id: switchId } })
    return result.count
  }
}
