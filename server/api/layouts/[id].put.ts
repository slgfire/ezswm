import type { LayoutTemplate } from '~/types/models'
import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Layout ID is required.' })
  }

  const body = await readBody<Partial<LayoutTemplate>>(event)
  const updated = await useStorage().layouts.update(id, body)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Layout not found.' })
  }

  return updated
})
