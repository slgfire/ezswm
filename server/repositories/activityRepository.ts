import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { ActivityEntry, ActivityAction } from '../../types/activity'

const MAX_ENTRIES = 1000

interface ActivityRow {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  entity_name: string
  changes: string | null
  previous_state: string | null
  metadata: string | null
  timestamp: string
}

function parseJsonOrUndefined(value: string | null): Record<string, unknown> | undefined {
  if (value === null) return undefined
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function rowToActivity(row: ActivityRow): ActivityEntry {
  return {
    id: row.id,
    user_id: row.user_id ?? '',
    action: row.action as ActivityAction,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    entity_name: row.entity_name,
    changes: parseJsonOrUndefined(row.changes),
    previous_state: parseJsonOrUndefined(row.previous_state),
    metadata: parseJsonOrUndefined(row.metadata),
    timestamp: row.timestamp
  }
}

export const activityRepository = {
  async list(limit?: number, offset?: number): Promise<{ entries: ActivityEntry[]; total: number }> {
    const total = await prisma.activityEntry.count()
    const rows = await prisma.activityEntry.findMany({
      orderBy: { timestamp: 'desc' },
      skip: offset ?? 0,
      ...(limit !== undefined ? { take: limit } : {})
    })
    return { entries: rows.map(rowToActivity), total }
  },

  async getById(id: string): Promise<ActivityEntry | null> {
    const row = await prisma.activityEntry.findUnique({ where: { id } })
    return row ? rowToActivity(row) : null
  },

  async log(data: {
    user_id: string
    action: ActivityAction
    entity_type: string
    entity_id: string
    entity_name: string
    changes?: Record<string, unknown>
    previous_state?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }): Promise<ActivityEntry> {
    const row = await prisma.activityEntry.create({
      data: {
        id: randomUUID(),
        user_id: data.user_id || null,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        entity_name: data.entity_name,
        changes: data.changes === undefined ? null : JSON.stringify(data.changes),
        previous_state: data.previous_state === undefined ? null : JSON.stringify(data.previous_state),
        metadata: data.metadata === undefined ? null : JSON.stringify(data.metadata),
        timestamp: new Date().toISOString()
      }
    })

    // Prune past MAX_ENTRIES (best-effort, runs after each insert).
    const total = await prisma.activityEntry.count()
    if (total > MAX_ENTRIES) {
      const keep = await prisma.activityEntry.findMany({
        orderBy: { timestamp: 'desc' },
        take: MAX_ENTRIES,
        select: { id: true }
      })
      const keepIds = new Set(keep.map(k => k.id))
      const toDelete = await prisma.activityEntry.findMany({
        select: { id: true }
      })
      const deleteIds = toDelete.map(d => d.id).filter(id => !keepIds.has(id))
      if (deleteIds.length > 0) {
        await prisma.activityEntry.deleteMany({ where: { id: { in: deleteIds } } })
      }
    }

    return rowToActivity(row)
  }
}
