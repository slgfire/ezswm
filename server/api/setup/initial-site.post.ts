import { settingsRepository } from '../../repositories/settingsRepository'
import { siteRepository } from '../../repositories/siteRepository'
import { createSiteSchema } from '../../validators/siteSchemas'
import { readJson, writeJson } from '../../storage/jsonStorage'
import { activityRepository } from '../../repositories/activityRepository'

// First-run-only endpoint: creates the initial site (operator-chosen name)
// and reassigns any orphan switches/VLANs/networks to it. Locked once
// settings.sites_initialized flips to true so it can't be misused later.
export default defineEventHandler(async (event) => {
  const settings = settingsRepository.get()
  if (settings.sites_initialized) {
    throw createError({ statusCode: 403, message: 'Initial site has already been created' })
  }

  const body = await readBody(event)
  const parsed = createSiteSchema.parse(body)

  const site = siteRepository.create(parsed)

  // Reassign orphan entities (those without a site_id) to the new site.
  const migrated = { switches: 0, vlans: 0, networks: 0 }

  const switches = readJson<{ site_id?: string }[]>('switches.json')
  for (const s of switches) {
    if (!s.site_id) {
      s.site_id = site.id
      migrated.switches++
    }
  }
  if (migrated.switches > 0) writeJson('switches.json', switches)

  const vlans = readJson<{ site_id?: string }[]>('vlans.json')
  for (const v of vlans) {
    if (!v.site_id) {
      v.site_id = site.id
      migrated.vlans++
    }
  }
  if (migrated.vlans > 0) writeJson('vlans.json', vlans)

  const networks = readJson<{ site_id?: string }[]>('networks.json')
  for (const n of networks) {
    if (!n.site_id) {
      n.site_id = site.id
      migrated.networks++
    }
  }
  if (migrated.networks > 0) writeJson('networks.json', networks)

  settingsRepository.update({ sites_initialized: true })

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'create',
    entity_type: 'site',
    entity_id: site.id,
    entity_name: site.name,
  })

  setResponseStatus(event, 201)
  return { site, migrated }
})
