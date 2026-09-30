import { switchRepository } from '../../repositories/switchRepository'
import { createSwitchSchema } from '../../validators/switchSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import { settingsRepository } from '../../repositories/settingsRepository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createSwitchSchema.parse(body)

  await assertGroupIdAllowed(parsed)

  const created = await switchRepository.create(parsed)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'create',
    entity_type: 'switch',
    entity_id: created.id,
    entity_name: created.name,
  })

  setResponseStatus(event, 201)
  return created
})

async function assertGroupIdAllowed(payload: { group_id?: string | null }): Promise<void> {
  if (!Object.prototype.hasOwnProperty.call(payload, 'group_id')) return

  const settings = await settingsRepository.get()
  if (!settings.switch_groups_enabled) {
    throw createError({ statusCode: 400, statusMessage: 'Switch groups are disabled' })
  }
}
