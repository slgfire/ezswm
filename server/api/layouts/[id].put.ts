import { repositories } from '~/server/repositories'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return repositories.layouts.update(id, await readBody(event))
})
