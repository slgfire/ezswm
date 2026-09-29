import { switchGroupRepository } from '../../repositories/switchGroupRepository'
import { sortSwitchGroupsSchema } from '../../validators/switchGroupSchemas'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = sortSwitchGroupsSchema.parse(body)

  await switchGroupRepository.updateSortOrder(parsed.order)
  return { ok: true }
})
