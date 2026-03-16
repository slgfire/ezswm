import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { VLAN } from '../../types/vlan'
import { VLAN_COLOR_POOL } from '../../types/vlan'

const FILE_NAME = 'vlans.json'

export const vlanRepository = {
  list(): VLAN[] {
    return readJson<VLAN[]>(FILE_NAME)
  },

  getById(id: string): VLAN | null {
    const vlans = this.list()
    return vlans.find(v => v.id === id) || null
  },

  getByVlanId(vlanId: number): VLAN | null {
    const vlans = this.list()
    return vlans.find(v => v.vlan_id === vlanId) || null
  },

  getNextAvailableColor(): string | null {
    const vlans = this.list()
    const usedColors = new Set(vlans.map(v => v.color))
    return VLAN_COLOR_POOL.find(c => !usedColors.has(c)) || null
  },

  create(data: Omit<VLAN, 'id' | 'created_at' | 'updated_at' | 'is_favorite'>): VLAN {
    const vlans = this.list()

    if (vlans.some(v => v.vlan_id === data.vlan_id)) {
      throw createError({ statusCode: 409, message: `VLAN ID ${data.vlan_id} already exists` })
    }

    if (vlans.some(v => v.color === data.color)) {
      throw createError({ statusCode: 409, message: `Color ${data.color} is already used by another VLAN` })
    }

    const now = new Date().toISOString()
    const vlan: VLAN = {
      id: nanoid(),
      ...data,
      is_favorite: false,
      created_at: now,
      updated_at: now
    }

    vlans.push(vlan)
    writeJson(FILE_NAME, vlans)
    return vlan
  },

  update(id: string, data: Partial<Omit<VLAN, 'id' | 'created_at'>>): VLAN {
    const vlans = this.list()
    const index = vlans.findIndex(v => v.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'VLAN not found' })
    }

    if (data.vlan_id !== undefined && data.vlan_id !== vlans[index].vlan_id) {
      if (vlans.some(v => v.vlan_id === data.vlan_id)) {
        throw createError({ statusCode: 409, message: `VLAN ID ${data.vlan_id} already exists` })
      }
    }

    if (data.color !== undefined && data.color !== vlans[index].color) {
      if (vlans.some(v => v.color === data.color)) {
        throw createError({ statusCode: 409, message: `Color ${data.color} is already used by another VLAN` })
      }
    }

    vlans[index] = {
      ...vlans[index],
      ...data,
      updated_at: new Date().toISOString()
    }

    writeJson(FILE_NAME, vlans)
    return vlans[index]
  },

  delete(id: string): boolean {
    const vlans = this.list()
    const index = vlans.findIndex(v => v.id === id)
    if (index === -1) return false

    vlans.splice(index, 1)
    writeJson(FILE_NAME, vlans)
    return true
  }
}
