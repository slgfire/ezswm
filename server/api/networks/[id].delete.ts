import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Network ID is required.' })

  const deleted = await useStorage().networks.delete(id)
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Network not found.' })
  return { ok: true }
})
