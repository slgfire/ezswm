import { switchGroupRepository } from '../../repositories/switchGroupRepository'
import { sortSwitchGroupsSchema } from '../../validators/switchGroupSchemas'
import { requireSwitchGroupsEnabled } from '../../utils/requireSwitchGroupsEnabled'

export default defineEventHandler(async (event) => {
  await requireSwitchGroupsEnabled()

  const body = await readBody(event)
  const parsed = sortSwitchGroupsSchema.parse(body)

  await switchGroupRepository.updateSortOrder(parsed.order)
  return { ok: true }
})
