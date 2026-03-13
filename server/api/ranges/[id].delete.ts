import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Range ID is required.' })

  const storage = useStorage()
  const deleted = await storage.ipRanges.delete(id)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Range not found.' })
  }

  return { ok: true }
})
