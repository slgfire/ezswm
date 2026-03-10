import { readStore, writeStore } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const store = await readStore()
  const before = store.layoutTemplates.length
  store.layoutTemplates = store.layoutTemplates.filter((layout) => layout.id !== id)
  if (before === store.layoutTemplates.length) {
    throw createError({ statusCode: 404, statusMessage: 'Layout nicht gefunden.' })
  }
  await writeStore(store)
  return { ok: true }
})
