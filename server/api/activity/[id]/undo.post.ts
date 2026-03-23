import { activityRepository } from '../../../repositories/activityRepository'
import { switchRepository } from '../../../repositories/switchRepository'
import { vlanRepository } from '../../../repositories/vlanRepository'
import { networkRepository } from '../../../repositories/networkRepository'
import { ipAllocationRepository } from '../../../repositories/ipAllocationRepository'
import { ipRangeRepository } from '../../../repositories/ipRangeRepository'
import { layoutTemplateRepository } from '../../../repositories/layoutTemplateRepository'
import { readJson, writeJson } from '../../../storage/jsonStorage'

export default defineEventHandler((event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Activity ID required' })

  const entry = activityRepository.getById(id)
  if (!entry) throw createError({ statusCode: 404, message: 'Activity entry not found' })
  if (!entry.previous_state && entry.action !== 'create') {
    throw createError({ statusCode: 400, message: 'No previous state available for undo' })
  }

  const entityType = entry.entity_type
  const entityId = entry.entity_id

  try {
    switch (entry.action) {
      case 'create': {
        // Undo create = delete
        const repos: Record<string, { delete: (id: string) => boolean }> = {
          switch: switchRepository,
          vlan: vlanRepository,
          network: networkRepository,
          layout_template: layoutTemplateRepository
        }
        const repo = repos[entityType]
        if (repo) repo.delete(entityId)
        break
      }
      case 'update': {
        // Undo update = restore previous state
        if (!entry.previous_state) break
        const fileMap: Record<string, string> = {
          switch: 'switches.json',
          vlan: 'vlans.json',
          network: 'networks.json',
          layout_template: 'layoutTemplates.json'
        }
        const fileName = fileMap[entityType]
        if (fileName) {
          const items = readJson<any[]>(fileName)
          const idx = items.findIndex((i: any) => i.id === entityId)
          if (idx !== -1) {
            items[idx] = entry.previous_state
            writeJson(fileName, items)
          }
        }
        break
      }
      case 'delete': {
        // Undo delete = recreate from previous state
        if (!entry.previous_state) break
        const fileMap: Record<string, string> = {
          switch: 'switches.json',
          vlan: 'vlans.json',
          network: 'networks.json',
          layout_template: 'layoutTemplates.json'
        }
        const fileName = fileMap[entityType]
        if (fileName) {
          const items = readJson<any[]>(fileName)
          items.push(entry.previous_state)
          writeJson(fileName, items)
        }
        break
      }
    }

    return { success: true, action: entry.action, entity_type: entityType }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: `Undo failed: ${err.message}` })
  }
})
