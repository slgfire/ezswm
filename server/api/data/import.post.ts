import { IMPORTERS, isEntityType } from '../../utils/entityImport'

// Legacy per-entity import endpoint. Body shape: { type, data: rows[] }.
// Kept for the in-app Data Management page which still calls this URL; the
// implementation routes through the same per-entity importer as
// /api/import/{entity}.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || !body.type || !Array.isArray(body.data)) {
    throw createError({ statusCode: 400, message: 'Request body must include "type" and "data" array.' })
  }

  if (!isEntityType(body.type)) {
    throw createError({
      statusCode: 400,
      message: `Unknown entity type "${body.type}". Valid: switches, vlans, networks, allocations, ranges, templates.`
    })
  }

  const rows = body.data as Record<string, unknown>[]
  if (rows.length > 5000) {
    throw createError({ statusCode: 400, message: 'Maximum 5000 rows per import.' })
  }

  const type = body.type as keyof typeof IMPORTERS
  const result = await IMPORTERS[type](rows)
  return {
    imported: result.imported,
    skipped: result.skipped,
    // Backward-compatible shape used by the Data Management UI.
    skippedDetails: result.errors.filter((e: { message: string }) => e.message.startsWith('Skipped:')).map((e: { message: string }) => e.message),
    errors: result.errors.filter((e: { message: string }) => !e.message.startsWith('Skipped:')).map((e: { message: string }) => e.message)
  }
})
