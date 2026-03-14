import { repositories } from '~/server/repositories'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  return repositories.switches.update(id, body)
})
