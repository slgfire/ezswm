import { randomUUID } from 'node:crypto'

/**
 * Build a map from old IDs to freshly minted UUIDv4s.
 * Used during the JSON → SQLite migration to rewrite nanoid references.
 */
export function buildIdMap<T extends { id: string }>(items: T[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, randomUUID())
  }
  return map
}

function isIdField(key: string): boolean {
  return key === 'id' || key.endsWith('_id')
}

function isIdsArrayField(key: string): boolean {
  return key.endsWith('_ids')
}

/**
 * Recursively walk a JSON-like value and rewrite any string that lives under
 * an `id` / `*_id` / `*_ids` key, replacing old IDs with their mapped values.
 *
 * Strings that don't sit under an ID-shaped key are left alone, even if they
 * happen to match an entry in the map — names and descriptions shouldn't be
 * touched.
 *
 * Special case: activity-log `changes` use a `{ field_name: { from, to } }`
 * shape. When the outer key looks like an ID field and the value is an object,
 * any string children of that object are also treated as candidates to remap
 * (so `{ vlan_id: { from: 'old', to: 'old2' } }` rewrites both `from` and `to`).
 */
export function remapJson(value: unknown, map: Map<string, string>): unknown {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(v => remapJson(v, map))
  if (typeof value !== 'object') return value

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'string' && isIdField(key)) {
      out[key] = map.get(val) ?? val
    } else if (Array.isArray(val) && isIdsArrayField(key)) {
      out[key] = val.map(v => (typeof v === 'string' ? (map.get(v) ?? v) : v))
    } else if (
      val !== null
      && typeof val === 'object'
      && !Array.isArray(val)
      && isIdField(key)
    ) {
      // Activity-log change object: remap any string children directly.
      out[key] = remapIdChangeObject(val as Record<string, unknown>, map)
    } else {
      out[key] = remapJson(val, map)
    }
  }
  return out
}

function remapIdChangeObject(obj: Record<string, unknown>, map: Map<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      out[k] = map.get(v) ?? v
    } else {
      out[k] = remapJson(v, map)
    }
  }
  return out
}

/**
 * Convenience: take a global merged map of all old → new IDs across every
 * entity type. Used as a single lookup for activity-log snapshots which may
 * reference IDs of any entity.
 */
export function mergeIdMaps(...maps: Array<Map<string, string>>): Map<string, string> {
  const merged = new Map<string, string>()
  for (const m of maps) {
    for (const [k, v] of m.entries()) merged.set(k, v)
  }
  return merged
}
