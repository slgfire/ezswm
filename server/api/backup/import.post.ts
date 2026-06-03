// Bulk restore is not yet ported to the SQLite schema. The legacy JSON-based
// importer would no-op after the 0.21 migration (the JSON files have been
// archived). Returning 501 with a clear message until the SQLite restore
// flow lands.
export default defineEventHandler(() => {
  throw createError({
    statusCode: 501,
    message: 'Backup restore is being reworked for the new SQLite storage and will return in a follow-up release.'
  })
})
