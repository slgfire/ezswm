import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Allocation ID is required.' })

  const deleted = await useStorage().ipAllocations.delete(id)
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Allocation not found.' })

  return { ok: true }
})
