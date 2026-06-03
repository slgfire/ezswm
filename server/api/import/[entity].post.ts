import { IMPORTERS, isEntityType } from '../../utils/entityImport'

// Per-entity bulk import. Body is either an array of rows or { data: rows[] }.
// Rows are validated, FK-resolved (e.g. site_id, network_id must point at
// existing entities), and inserted one at a time so a single bad row reports
// an error instead of sinking the whole batch. Duplicates (e.g. existing VLAN
// (site_id, vlan_id)) are counted in `skipped`.
export default defineEventHandler(async (event) => {
  const entity = event.context.params?.entity
  if (!isEntityType(entity)) {
    throw createError({
      statusCode: 400,
      message: `Unknown entity type "${entity}". Valid: switches, vlans, networks, allocations, ranges, templates.`
    })
  }

  const body = await readBody(event)
  let rows: Record<string, unknown>[]

  if (Array.isArray(body)) {
    rows = body as Record<string, unknown>[]
  } else if (body && Array.isArray((body as { data: unknown }).data)) {
    rows = (body as { data: Record<string, unknown>[] }).data
  } else {
    throw createError({
      statusCode: 400,
      message: 'Body must be an array of rows or an object with a `data` array.'
    })
  }

  if (rows.length > 5000) {
    throw createError({ statusCode: 400, message: 'Maximum 5000 rows per import.' })
  }

  const result = await IMPORTERS[entity](rows)
  return {
    total: rows.length,
    imported: result.imported,
    skipped: result.skipped,
    errors: result.errors
  }
})
