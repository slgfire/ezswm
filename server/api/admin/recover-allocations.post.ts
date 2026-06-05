import { prisma } from '../../db/client'
import { recoverArchivedAllocations } from '../../utils/recoverArchivedAllocations'

/**
 * POST /api/admin/recover-allocations
 *
 * Repopulates IP allocations that didn't make it through the 0.21 JSON→SQLite
 * migration by replaying the archived ip-allocations.json against the current
 * DB. Matches each archived allocation to a current network by subnet
 * containment (with site/network name disambiguation when subnets overlap).
 *
 * Defaults to **dry-run**. Pass `?apply=1` to actually insert.
 *
 * Admin auth only.
 */
export default defineEventHandler(async (event) => {
  const auth = event.context.auth as { userId?: string; role?: string } | undefined
  if (!auth?.userId) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  if (auth.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
  }

  const query = getQuery(event)
  const apply = query.apply === '1' || query.apply === 'true'

  const config = useRuntimeConfig()
  const dataDir = config.dataDir

  const report = await recoverArchivedAllocations({ prisma, dataDir, apply })

  return {
    apply,
    dataDir,
    summary: {
      archiveDir: report.archiveDir,
      archivedAllocations: report.archivedAllocations,
      alreadyInDb: report.alreadyInDb,
      recovered: report.recovered,
      skippedOrphan: report.skippedOrphan,
      skippedAmbiguous: report.skippedAmbiguous,
      skippedNoSubnetMatch: report.skippedNoSubnetMatch,
      skippedInvalidIp: report.skippedInvalidIp
    },
    details: report.details
  }
})
