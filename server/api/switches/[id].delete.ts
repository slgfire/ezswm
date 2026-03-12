import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Switch ID is required.' })
  }

  const deleted = await useStorage().switches.delete(id)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found.' })
  }

  return { ok: true }
})
