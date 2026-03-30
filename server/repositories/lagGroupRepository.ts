import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { LAGGroup } from '../../types/lagGroup'
import { switchRepository } from './switchRepository'

const FILE_NAME = 'lagGroups.json'

export const lagGroupRepository = {
  list(switchId?: string): LAGGroup[] {
    const groups = readJson<LAGGroup[]>(FILE_NAME)
    if (switchId) {
      return groups.filter(g => g.switch_id === switchId)
    }
    return groups
  },

  getById(id: string): LAGGroup | null {
    const groups = readJson<LAGGroup[]>(FILE_NAME)
    return groups.find(g => g.id === id) || null
  },

  create(switchId: string, data: Omit<LAGGroup, 'id' | 'switch_id' | 'created_at' | 'updated_at'>): LAGGroup {
    const sw = switchRepository.getById(switchId)
    if (!sw) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }

    // Validate port ownership
    for (const portId of data.port_ids) {
      if (!sw.ports.some(p => p.id === portId)) {
        throw createError({ statusCode: 400, message: `Port ${portId} does not belong to switch ${sw.name}` })
      }
    }

    // Check ports not already in a LAG
    const existingGroups = this.list(switchId)
    for (const portId of data.port_ids) {
      const existingLag = existingGroups.find(g => g.port_ids.includes(portId))
      if (existingLag) {
        throw createError({ statusCode: 409, message: `Port is already in LAG group '${existingLag.name}'` })
      }
    }

    const groups = readJson<LAGGroup[]>(FILE_NAME)
    const now = new Date().toISOString()
    const group: LAGGroup = {
      id: nanoid(),
      switch_id: switchId,
      ...data,
      created_at: now,
      updated_at: now
    }

    groups.push(group)
    writeJson(FILE_NAME, groups)

    // Update ports with lag_group_id
    for (const portId of data.port_ids) {
      switchRepository.updatePort(switchId, portId, { lag_group_id: group.id })
    }

    return group
  },

  update(id: string, data: Partial<Omit<LAGGroup, 'id' | 'switch_id' | 'created_at'>>): LAGGroup {
    const groups = readJson<LAGGroup[]>(FILE_NAME)
    const index = groups.findIndex(g => g.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'LAG group not found' })
    }

    const current = groups[index]!

    if (data.port_ids) {
      const sw = switchRepository.getById(current.switch_id)
      if (!sw) {
        throw createError({ statusCode: 404, message: 'Switch not found' })
      }

      for (const portId of data.port_ids) {
        if (!sw.ports.some(p => p.id === portId)) {
          throw createError({ statusCode: 400, message: `Port ${portId} does not belong to switch` })
        }
      }

      // Remove lag_group_id from old ports
      for (const portId of current.port_ids) {
        if (!data.port_ids.includes(portId)) {
          switchRepository.updatePort(current.switch_id, portId, { lag_group_id: undefined })
        }
      }

      // Add lag_group_id to new ports
      for (const portId of data.port_ids) {
        if (!current.port_ids.includes(portId)) {
          switchRepository.updatePort(current.switch_id, portId, { lag_group_id: id })
        }
      }
    }

    groups[index] = {
      ...current,
      ...data,
      updated_at: new Date().toISOString()
    } as LAGGroup

    writeJson(FILE_NAME, groups)
    return groups[index]!
  },

  delete(id: string): boolean {
    const groups = readJson<LAGGroup[]>(FILE_NAME)
    const index = groups.findIndex(g => g.id === id)
    if (index === -1) return false

    const group = groups[index]!

    // Remove lag_group_id from ports
    for (const portId of group.port_ids) {
      try {
        switchRepository.updatePort(group.switch_id, portId, { lag_group_id: undefined })
      } catch {
        // Port or switch may have been deleted
      }
    }

    groups.splice(index, 1)
    writeJson(FILE_NAME, groups)
    return true
  },

  deleteBySwitchId(switchId: string): number {
    const groups = readJson<LAGGroup[]>(FILE_NAME)
    const filtered = groups.filter(g => g.switch_id !== switchId)
    const deleted = groups.length - filtered.length
    writeJson(FILE_NAME, filtered)
    return deleted
  }
}
