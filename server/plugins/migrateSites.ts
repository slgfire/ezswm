import { readJson } from '../storage/jsonStorage'

// Detection-only: counts orphan entities (without site_id) so they show up
// in the startup log. Actual site creation + reassignment happens through
// the first-run setup wizard via /api/setup/initial-site, so the operator
// gets to name the first site instead of receiving an opaque "Default".
export default defineNitroPlugin(() => {
  const sites = readJson<Record<string, unknown>[]>('sites.json')
  if (sites.length > 0) return

  const switches = readJson<{ site_id?: string }[]>('switches.json')
  const vlans = readJson<{ site_id?: string }[]>('vlans.json')
  const networks = readJson<{ site_id?: string }[]>('networks.json')

  const orphanSwitches = switches.filter(s => !s.site_id).length
  const orphanVlans = vlans.filter(v => !v.site_id).length
  const orphanNetworks = networks.filter(n => !n.site_id).length
  const total = orphanSwitches + orphanVlans + orphanNetworks

  if (total > 0) {
    console.log(`[migration] Found orphan entities awaiting site assignment: ${orphanSwitches} switches, ${orphanVlans} VLANs, ${orphanNetworks} networks — first-run wizard will assign them`)
  }
})
