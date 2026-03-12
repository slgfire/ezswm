import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Layout ID is required.' })
  }

  const deleted = await useStorage().layouts.delete(id)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Layout not found.' })
  }

  return { ok: true }
})
