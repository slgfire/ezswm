import { readStore } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const store = await readStore()
  const item = store.switches.find((sw) => sw.id === id)
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Switch nicht gefunden.' })
  }
  return item
})
