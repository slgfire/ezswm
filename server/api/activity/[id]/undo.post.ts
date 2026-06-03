// Activity undo is being reworked for the SQLite schema. The legacy
// implementation wrote `previous_state` snapshots back into the JSON files
// directly, which doesn't translate cleanly to multi-table updates with FK
// constraints. Returning 501 until the new flow lands.
export default defineEventHandler(() => {
  throw createError({
    statusCode: 501,
    message: 'Activity undo is being reworked for the new SQLite storage and will return in a follow-up release.'
  })
})
