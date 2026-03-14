import type { LayoutTemplate } from '~/types/models'
import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<LayoutTemplate>>(event)

  const hasBlocks = Boolean(body.blocks?.length)
  const hasGrid = Boolean(body.rows && body.cols)

  if (!body.name || !body.type || (!hasBlocks && !hasGrid)) {
    throw createError({ statusCode: 400, statusMessage: 'Layout is incomplete.' })
  }

  return useStorage().layouts.create({
    name: body.name,
    description: body.description,
    rows: body.rows || 1,
    cols: body.cols || 1,
    type: body.type,
    meta: body.meta || {},
    specialAreas: body.specialAreas || [],
    blocks: body.blocks || [],
    cells: body.cells || []
  })
})
