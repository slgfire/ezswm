import { repositories } from '../../repositories'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return repositories.networks.create(body)
})
