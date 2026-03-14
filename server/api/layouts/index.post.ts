import { repositories } from '~/server/repositories'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return repositories.layouts.create(body)
})
