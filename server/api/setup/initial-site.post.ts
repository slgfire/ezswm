import { settingsRepository } from '../../repositories/settingsRepository'
import { siteRepository } from '../../repositories/siteRepository'
import { createSiteSchema } from '../../validators/siteSchemas'
import { activityRepository } from '../../repositories/activityRepository'

// First-run-only endpoint: creates the initial site (operator-chosen name).
// Locked once settings.sites_initialized flips to true so it can't be misused
// later. With SQLite + FK constraints there are no orphan rows to reassign —
// the JSON→DB migration already attached every entity to its site_id.
export default defineEventHandler(async (event) => {
  const settings = await settingsRepository.get()
  if (settings.sites_initialized) {
    throw createError({ statusCode: 403, message: 'Initial site has already been created' })
  }

  const body = await readBody(event)
  const parsed = createSiteSchema.parse(body)

  const site = await siteRepository.create(parsed)
  await settingsRepository.update({ sites_initialized: true })

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'create',
    entity_type: 'site',
    entity_id: site.id,
    entity_name: site.name,
  })

  setResponseStatus(event, 201)
  return { site, migrated: { switches: 0, vlans: 0, networks: 0 } }
})
