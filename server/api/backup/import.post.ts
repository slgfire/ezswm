import { prisma } from '../../db/client'
import { restoreAll } from '../../utils/dataRestore'

// Whole-DB restore. Accepts the `schema: "sqlite-v1"` payload produced by
// /api/backup/export. Wipes every table and bulk-inserts the dump in FK-safe
// order inside a single transaction. Rejects nanoid-shaped IDs upfront so old
// pre-0.21 dumps fail cleanly instead of corrupting the new schema.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  try {
    const result = await restoreAll(prisma, body)
    return { success: true, restored: result.inserted }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500
    throw createError({ statusCode, message: `Restore failed: ${message}` })
  }
})
