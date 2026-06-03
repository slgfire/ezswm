// Per-entity CSV/JSON import is being reworked for SQLite + UUIDv4. The
// legacy nanoid-based importer is incompatible with the new schema's
// FK constraints, so we return 501 until the new flow lands.
export default defineEventHandler(() => {
  throw createError({
    statusCode: 501,
    message: 'Entity import is being reworked for the new SQLite storage and will return in a follow-up release.'
  })
})
