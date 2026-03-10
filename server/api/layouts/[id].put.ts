import type { LayoutTemplate } from '~/types/models'
import { readStore, writeStore } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<Partial<LayoutTemplate>>(event)
  const store = await readStore()
  const idx = store.layoutTemplates.findIndex((layout) => layout.id === id)
  if (idx < 0) {
    throw createError({ statusCode: 404, statusMessage: 'Layout nicht gefunden.' })
  }
  store.layoutTemplates[idx] = {
    ...store.layoutTemplates[idx],
    ...body,
    id: store.layoutTemplates[idx].id
  }
  await writeStore(store)
  return store.layoutTemplates[idx]
})
