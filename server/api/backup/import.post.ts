import { prisma } from '../../db/client'
import { restoreAll } from '../../utils/dataRestore'
import { clearOidcClientCache } from '../../utils/oidc/client'
import { getKeyState, readOidcRuntimeSettings } from '../../utils/oidc/session'

// Whole-DB restore. Accepts the `schema: "sqlite-v1"` payload produced by
// /api/backup/export. Wipes every table and bulk-inserts the dump in FK-safe
// order inside a single transaction. Rejects nanoid-shaped IDs upfront so old
// pre-0.21 dumps fail cleanly instead of corrupting the new schema.
// OIDC: login transactions are always purged (never restored); the config revision
// only moves forward (invalidating prior SSO sessions); a secret this instance's
// OIDC_ENCRYPTION_KEY cannot decrypt disables SSO (local login keeps working).
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  try {
    const keyState = getKeyState(readOidcRuntimeSettings())
    const result = await restoreAll(prisma, body, { oidcKey: keyState.key ?? null })
    clearOidcClientCache()
    return {
      success: true,
      restored: result.inserted,
      ...(result.oidcDisabledUndecryptable ? { warnings: ['oidc_disabled_secret_undecryptable'] } : {})
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500
    throw createError({ statusCode, message: `Restore failed: ${message}` })
  }
})
