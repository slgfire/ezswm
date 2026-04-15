import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { Site } from '../../types/site'
import type { Switch } from '../../types/switch'
import type { VLAN } from '../../types/vlan'
import type { Network } from '../../types/network'

const FILE_NAME = 'sites.json'

export const siteRepository = {
  list(): Site[] {
    return readJson<Site[]>(FILE_NAME)
  },

  getById(id: string): Site | null {
    const sites = this.list()
    return sites.find(s => s.id === id) || null
  },

  create(data: Omit<Site, 'id' | 'created_at' | 'updated_at'>): Site {
    const sites = this.list()

    const now = new Date().toISOString()
    const site: Site = {
      id: nanoid(),
      ...data,
      created_at: now,
      updated_at: now
    }

    sites.push(site)
    writeJson(FILE_NAME, sites)
    return site
  },

  update(id: string, data: Partial<Omit<Site, 'id' | 'created_at'>>): Site {
    const sites = this.list()
    const index = sites.findIndex(s => s.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'Site not found' })
    }

    sites[index] = {
      ...sites[index],
      ...data,
      updated_at: new Date().toISOString()
    } as Site

    writeJson(FILE_NAME, sites)
    return sites[index]!
  },

  delete(id: string): boolean {
    const sites = this.list()
    const index = sites.findIndex(s => s.id === id)
    if (index === -1) {
      return false
    }

    sites.splice(index, 1)
    writeJson(FILE_NAME, sites)
    return true
  },

  getEntityCounts(siteId: string): { switches: number; vlans: number; networks: number } {
    const switches = readJson<Switch[]>('switches.json')
    const vlans = readJson<VLAN[]>('vlans.json')
    const networks = readJson<Network[]>('networks.json')

    return {
      switches: switches.filter((s) => s.site_id === siteId).length,
      vlans: vlans.filter((v) => v.site_id === siteId).length,
      networks: networks.filter((n) => n.site_id === siteId).length
    }
  },

  hasEntities(siteId: string): boolean {
    const counts = this.getEntityCounts(siteId)
    return counts.switches > 0 || counts.vlans > 0 || counts.networks > 0
  }
}
