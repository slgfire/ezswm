import { switchRepository } from '../../repositories/switchRepository'
import { updateSwitchSchema } from '../../validators/switchSchemas'
import { logActivity } from '../../utils/activityLog'
import { resolveSwitchParam } from '../../utils/resolveSwitchParam'
import { settingsRepository } from '../../repositories/settingsRepository'
import type { Switch } from '../../../types/switch'

export default defineEventHandler(async (event) => {
  const existing = await resolveSwitchParam(event)

  const body = await readBody(event)
  const parsed = updateSwitchSchema.parse(body)

  await assertGroupIdAllowed(parsed)

  const updated = await switchRepository.update(
    existing.id,
    parsed as Partial<Omit<Switch, 'id' | 'ports' | 'created_at'>>,
    existing.site_id
  )

  await logActivity(event, {
    action: 'update',
    entity_type: 'switch',
    entity_id: existing.id,
    entity_name: updated.name,
    changes: parsed as Record<string, unknown>,
    previous_state: existing as unknown as Record<string, unknown>,
  })

  return updated as unknown as Record<string, unknown>
})

async function assertGroupIdAllowed(payload: { group_id?: string | null }): Promise<void> {
  if (!Object.prototype.hasOwnProperty.call(payload, 'group_id')) return

  const settings = await settingsRepository.get()
  if (!settings.switch_groups_enabled) {
    throw createError({ statusCode: 400, statusMessage: 'Switch groups are disabled' })
  }
}
