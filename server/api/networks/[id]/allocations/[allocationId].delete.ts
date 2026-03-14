import { repositories } from '../../../../../repositories'

export default defineEventHandler(async (event) => {
  await repositories.allocations.delete(getRouterParam(event, 'allocationId')!)
  return { ok: true }
})
