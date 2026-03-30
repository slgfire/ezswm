import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { ActivityEntry, ActivityAction } from '../../types/activity'

const FILE_NAME = 'activity.json'
const MAX_ENTRIES = 1000

export const activityRepository = {
  list(limit?: number, offset?: number): { entries: ActivityEntry[], total: number } {
    const entries = readJson<ActivityEntry[]>(FILE_NAME)
    // Most recent first
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const total = entries.length
    const start = offset || 0
    const end = limit ? start + limit : entries.length
    return { entries: entries.slice(start, end), total }
  },

  getById(id: string): ActivityEntry | null {
    const entries = readJson<ActivityEntry[]>(FILE_NAME)
    return entries.find(e => e.id === id) || null
  },

  log(data: {
    user_id: string
    action: ActivityAction
    entity_type: string
    entity_id: string
    entity_name: string
    changes?: Record<string, unknown>
    previous_state?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }): ActivityEntry {
    const entries = readJson<ActivityEntry[]>(FILE_NAME)

    const entry: ActivityEntry = {
      id: nanoid(),
      ...data,
      timestamp: new Date().toISOString()
    }

    entries.push(entry)

    // Prune if over limit
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      entries.length = MAX_ENTRIES
    }

    writeJson(FILE_NAME, entries)
    return entry
  }
}
