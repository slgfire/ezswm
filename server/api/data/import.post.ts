// Alias of /api/backup/import. Disabled until the SQLite-aware restore flow
// lands; see backup/import.post.ts.
export default defineEventHandler(() => {
  throw createError({
    statusCode: 501,
    message: 'Data import is being reworked for the new SQLite storage and will return in a follow-up release.'
  })
})
