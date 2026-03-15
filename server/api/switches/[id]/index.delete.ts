import { switchesRepository } from '~/server/repositories/switches.repository'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  let found = false
  await switchesRepository.updateAll(items => items.filter(item => { const keep = item.id !== id; if (!keep) found = true; return keep }), event)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  return { deleted: true }
})
