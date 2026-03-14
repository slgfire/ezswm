import { repositories } from '../../repositories'

export default defineEventHandler(async (event) => {
  await repositories.layouts.delete(getRouterParam(event, 'id')!)
  return { ok: true }
})
