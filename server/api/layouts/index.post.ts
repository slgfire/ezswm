import type { LayoutTemplate } from '~/types/models'
import { newId, readStore, writeStore } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<LayoutTemplate>>(event)
  if (!body.name || !body.rows || !body.cols || !body.type) {
    throw createError({ statusCode: 400, statusMessage: 'Layout unvollständig.' })
  }
  const store = await readStore()
  const created: LayoutTemplate = {
    id: newId('layout'),
    name: body.name,
    description: body.description,
    rows: body.rows,
    cols: body.cols,
    type: body.type,
    meta: body.meta || {},
    specialAreas: body.specialAreas || [],
    cells: body.cells || []
  }
  store.layoutTemplates.push(created)
  await writeStore(store)
  return created
})
