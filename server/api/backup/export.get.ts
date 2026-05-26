import { readJson } from '../../storage/jsonStorage'

export default defineEventHandler((event) => {
  const backup = {
    version: useRuntimeConfig().public.appVersion,
    created_at: new Date().toISOString(),
    data: {
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
  }

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="ezswm-backup-${new Date().toISOString().slice(0, 10)}.json"`)

  return backup
})
