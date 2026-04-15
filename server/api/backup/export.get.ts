import { readJson } from '../../storage/jsonStorage'

export default defineEventHandler((event) => {
  const backup = {
    version: '0.1.0',
    created_at: new Date().toISOString(),
    data: {
      users: readJson('users.json'),
      switches: readJson('switches.json'),
      vlans: readJson('vlans.json'),
      networks: readJson('networks.json'),
      ipAllocations: readJson('ipAllocations.json'),
      ipRanges: readJson('ipRanges.json'),
      layoutTemplates: readJson('layoutTemplates.json'),
      lagGroups: readJson('lagGroups.json'),
      activity: readJson('activity.json'),
      settings: readJson('settings.json'),
      publicTokens: readJson('publicTokens.json')
    }
  }

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="ezswm-backup-${new Date().toISOString().slice(0, 10)}.json"`)

  return backup
})
