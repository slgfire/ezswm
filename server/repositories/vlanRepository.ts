import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { VLAN } from '../../types/vlan'
import { VLAN_COLOR_POOL } from '../../types/vlan'

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
    const tagClash = await prisma.vlan.findFirst({
      where: { site_id: data.site_id, vlan_id: data.vlan_id }
    })
    if (tagClash) {
      throw createError({ statusCode: 409, message: `VLAN ID ${data.vlan_id} already exists in this site` })
    }
    const colorClash = await prisma.vlan.findFirst({
      where: { site_id: data.site_id, color: data.color }
    })
    if (colorClash) {
      throw createError({ statusCode: 409, message: `Color ${data.color} is already used by another VLAN in this site` })
    }

    const now = new Date().toISOString()
    const row = await prisma.vlan.create({
      data: {
        id: randomUUID(),
        site_id: data.site_id,
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

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.vlan.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  }
}
