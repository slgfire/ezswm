import { ipRangeRepository } from '../../../../repositories/ipRangeRepository'
import { networkRepository } from '../../../../repositories/networkRepository'
import { createIpRangeSchema } from '../../../../validators/ipRangeSchemas'
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
  const parsed = createIpRangeSchema.parse(body)

  const created = ipRangeRepository.create(id, parsed)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'create',
    entity_type: 'ip_range',
    entity_id: created.id,
    entity_name: `${created.start_ip} - ${created.end_ip}`,
  })

  setResponseStatus(event, 201)
  return created
})
