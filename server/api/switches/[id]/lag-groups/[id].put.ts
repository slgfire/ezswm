import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { updateLagGroupSchema } from '../../../../validators/lagGroupSchemas'
import type { LAGGroup } from '../../../../../types/lagGroup'

export default defineEventHandler(async (event) => {
  const lagId = event.context.params?.id
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  const body = await readBody(event)
  const validated = updateLagGroupSchema.parse(body)
  return lagGroupRepository.update(lagId, validated as Partial<Omit<LAGGroup, 'id' | 'switch_id' | 'created_at'>>)
})
