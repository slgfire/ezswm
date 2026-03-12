import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const item = id ? await useStorage().switches.getById(id) : undefined
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found.' })
  }
  return item
})
