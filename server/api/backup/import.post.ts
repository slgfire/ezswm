import { readJson, writeJson } from '../../storage/jsonStorage'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || !body.data) {
    throw createError({ statusCode: 400, message: 'Invalid backup format' })
  }

  // Validate required keys
  const requiredKeys = ['users', 'switches', 'vlans', 'networks', 'ipAllocations', 'ipRanges', 'layoutTemplates', 'lagGroups', 'activity', 'settings']
  for (const key of requiredKeys) {
    if (!(key in body.data)) {
      throw createError({ statusCode: 400, message: `Missing data key: ${key}` })
    }
  }

  // Create pre-restore backup
  const preRestoreBackup = {
    users: readJson('users.json'),
    switches: readJson('switches.json'),
    vlans: readJson('vlans.json'),
    networks: readJson('networks.json'),
    ipAllocations: readJson('ip-allocations.json'),
    ipRanges: readJson('ip-ranges.json'),
    layoutTemplates: readJson('layout-templates.json'),
    lagGroups: readJson('lag-groups.json'),
    activity: readJson('activity.json'),
    settings: readJson('settings.json'),
    publicTokens: readJson('public-tokens.json'),
    topologyLayouts: readJson('topology-layouts.json')
  }

  try {
    // Restore all data files
    const fileMap: Record<string, string> = {
      users: 'users.json',
      switches: 'switches.json',
      vlans: 'vlans.json',
      networks: 'networks.json',
      ipAllocations: 'ip-allocations.json',
      ipRanges: 'ip-ranges.json',
      layoutTemplates: 'layout-templates.json',
      lagGroups: 'lag-groups.json',
      activity: 'activity.json',
      settings: 'settings.json',
      publicTokens: 'public-tokens.json',
      topologyLayouts: 'topology-layouts.json'
    }

    for (const [key, fileName] of Object.entries(fileMap)) {
      writeJson(fileName as string, body.data[key] ?? [])
    }

    return { success: true, message: 'Backup restored successfully' }
  } catch (error: unknown) {
    // Attempt to restore pre-backup state
    try {
      for (const [key, data] of Object.entries(preRestoreBackup)) {
        const fileMap: Record<string, string> = {
          users: 'users.json', switches: 'switches.json', vlans: 'vlans.json',
          networks: 'networks.json', ipAllocations: 'ip-allocations.json', ipRanges: 'ip-ranges.json',
          layoutTemplates: 'layout-templates.json', lagGroups: 'lag-groups.json',
          activity: 'activity.json', settings: 'settings.json', topologyLayouts: 'topology-layouts.json'
        }
        writeJson(fileMap[key]!, data)
      }
    } catch { /* ignore */
      // Best effort rollback
    }
    const message = error instanceof Error ? error.message : String(error)
    throw createError({ statusCode: 500, message: `Restore failed: ${message}` })
  }
})
