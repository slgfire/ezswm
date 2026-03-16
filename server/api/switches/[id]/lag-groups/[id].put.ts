import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { updateLagGroupSchema } from '../../../../validators/lagGroupSchemas'

export default defineEventHandler(async (event) => {
  const lagId = event.context.params?.id
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  const body = await readBody(event)
  const validated = updateLagGroupSchema.parse(body)
  return lagGroupRepository.update(lagId, validated)
})
