import { readStore, writeStore } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const store = await readStore()
  const before = store.switches.length
  store.switches = store.switches.filter((sw) => sw.id !== id)
  if (store.switches.length === before) {
    throw createError({ statusCode: 404, statusMessage: 'Switch nicht gefunden.' })
  }
  await writeStore(store)
  return { ok: true }
})
