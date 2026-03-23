import { vlanRepository } from '../../repositories/vlanRepository'
import { createVlanSchema } from '../../validators/vlanSchemas'
import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createVlanSchema.parse(body)

  // Auto-assign color if not provided
  if (!parsed.color) {
    const nextColor = vlanRepository.getNextAvailableColor()
    if (nextColor) {
      parsed.color = nextColor
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'No colors available. Please provide a color manually.',
      })
    }
  }

  const created = vlanRepository.create(parsed as Required<Pick<typeof parsed, 'color'>> & typeof parsed)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'create',
    entity_type: 'vlan',
    entity_id: created.id,
    entity_name: created.name,
  })

  setResponseStatus(event, 201)
  return created
})
