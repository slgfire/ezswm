import { repositories } from '../../../../../repositories'

export default defineEventHandler(async (event) => {
  await repositories.ranges.delete(getRouterParam(event, 'rangeId')!)
  return { ok: true }
})
