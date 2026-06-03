import { settingsRepository } from '../../repositories/settingsRepository'

// Returns the bits the first-run setup wizard needs to decide which steps to
// show. After the move to SQLite there are no orphan rows (every entity now
// has a NOT NULL site_id with a FK constraint), so we report zeros there for
// backwards compatibility with the wizard's response shape.
export default defineEventHandler(async () => {
  const settings = await settingsRepository.get()
  return {
    setup_completed: settings.setup_completed,
    sites_initialized: settings.sites_initialized,
    orphans: { switches: 0, vlans: 0, networks: 0 }
  }
})
