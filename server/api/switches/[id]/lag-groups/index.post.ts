import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { createLagGroupSchema } from '../../../../validators/lagGroupSchemas'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })

  const body = await readBody(event)
  const validated = createLagGroupSchema.parse(body)

  const group = lagGroupRepository.create(switchId, validated)
  setResponseStatus(event, 201)
  return group
})
