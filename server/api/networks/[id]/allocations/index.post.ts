import { ipAllocationRepository } from '../../../../repositories/ipAllocationRepository'
import { networkRepository } from '../../../../repositories/networkRepository'
import { createIpAllocationSchema } from '../../../../validators/ipAllocationSchemas'
import { activityRepository } from '../../../../repositories/activityRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing network ID' })
  }

  const network = networkRepository.getById(id)

  if (!network) {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  const body = await readBody(event)
  const parsed = createIpAllocationSchema.parse(body)

  const created = ipAllocationRepository.create(id, parsed)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'create',
    entity_type: 'ip_allocation',
    entity_id: created.id,
    entity_name: created.ip_address,
  })

  setResponseStatus(event, 201)
  return created
})
