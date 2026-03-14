import { repositories } from '../../../../repositories'

export default defineEventHandler(async (event) => {
  const portId = getRouterParam(event, 'portId')!
  const body = await readBody(event)
  return repositories.ports.update(portId, body)
})
