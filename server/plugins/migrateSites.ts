import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'

export default defineNitroPlugin(() => {
  // Check if sites.json exists and has entries
  const sites = readJson<Record<string, unknown>[]>('sites.json')

  if (sites.length === 0) {
    // Create default site
    const defaultSite = {
      id: nanoid(),
      name: 'Default',
      description: 'Default site',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    writeJson('sites.json', [defaultSite])

    // Migrate existing entities
    const defaultId = defaultSite.id

    // Switches
    const switches = readJson<Record<string, unknown>[]>('switches.json')
    if (switches.length > 0) {
      for (const sw of switches) {
        if (!sw.site_id) sw.site_id = defaultId
      }
      writeJson('switches.json', switches)
    }

    // VLANs
    const vlans = readJson<Record<string, unknown>[]>('vlans.json')
    if (vlans.length > 0) {
      for (const v of vlans) {
        if (!v.site_id) v.site_id = defaultId
      }
      writeJson('vlans.json', vlans)
    }

    // Networks
    const networks = readJson<Record<string, unknown>[]>('networks.json')
    if (networks.length > 0) {
      for (const n of networks) {
        if (!n.site_id) n.site_id = defaultId
      }
      writeJson('networks.json', networks)
    }

    console.log(`[ezSWM] Created default site and migrated ${switches.length} switches, ${vlans.length} VLANs, ${networks.length} networks`)
  }
})
