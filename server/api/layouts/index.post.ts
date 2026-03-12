import type { LayoutTemplate } from '~/types/models'
import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<LayoutTemplate>>(event)
  if (!body.name || !body.rows || !body.cols || !body.type) {
    throw createError({ statusCode: 400, statusMessage: 'Layout is incomplete.' })
  }

  return useStorage().layouts.create({
    name: body.name,
    description: body.description,
    rows: body.rows,
    cols: body.cols,
    type: body.type,
    meta: body.meta || {},
    specialAreas: body.specialAreas || [],
    cells: body.cells || []
  })
})
