import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createTestPrisma } from './testHelpers'
import { asCookie, dispatch, installH3Globals, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'

describe('SQLite export snapshots', () => {
  let db: PrismaClient
  let cleanup: () => Promise<void>
  beforeAll(async () => {
    installH3Globals()
    setOidcRuntime({})
    const context = await createTestPrisma()
    db = context.prisma
    cleanup = context.cleanup
    globalThis.__prismaTestClient = db
  })
  afterAll(async () => {
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })

  it('exports a complete paginated snapshot with stable tie ordering and preserves the backup-only table boundary', async () => {
    const admin = await seedLocalUser(db, { username: 'export_admin' })
    const viewer = await seedLocalUser(db, { username: 'export_viewer', role: 'viewer' })
    const ids = Array.from({ length: 259 }, (_, i) => `activity-${String(i).padStart(4, '0')}`)
    const timestamp = '2026-11-18T00:00:00.000Z'
    await db.activityEntry.createMany({ data: ids.toReversed().map(id => ({
      id, timestamp, action: 'create', entity_type: 'switch', entity_id: id, entity_name: id
    })) })

    const contents = async (path: string, user: typeof admin) => {
      const result = await dispatch({ path, cookies: asCookie(tokenFor(user)) })
      expect(result.status).toBe(200)
      expect(result.headers['cache-control']).toBe('no-store')
      return result.body as { schema: string, data: { activity: { id: string }[], users?: unknown[] } }
    }
    const inventory = await contents('/api/data/export', viewer)
    expect(inventory.schema).toBe('sqlite-v1')
    expect(inventory.data.activity.map(row => row.id)).toEqual(ids)
    expect(inventory.data.users).toBeUndefined()
    const backup = await contents('/api/backup/export', admin)
    expect(backup.data.activity.map(row => row.id)).toEqual(ids)
    expect(backup.data.users).toHaveLength(2)
  })
})
