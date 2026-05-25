import { settingsRepository } from '../../repositories/settingsRepository'
import { readJson } from '../../storage/jsonStorage'

// Returns everything the first-run setup wizard needs to decide which steps
// to show: whether the admin user already exists, whether the first site
// has been created, and how many orphan entities are waiting for site
// assignment (migration scenario).
export default defineEventHandler(() => {
  const settings = settingsRepository.get()

  const switches = readJson<{ site_id?: string }[]>('switches.json')
  const vlans = readJson<{ site_id?: string }[]>('vlans.json')
  const networks = readJson<{ site_id?: string }[]>('networks.json')

  return {
    setup_completed: settings.setup_completed,
    sites_initialized: settings.sites_initialized,
    orphans: {
      switches: switches.filter(s => !s.site_id).length,
      vlans: vlans.filter(v => !v.site_id).length,
      networks: networks.filter(n => !n.site_id).length
    }
  }
})
