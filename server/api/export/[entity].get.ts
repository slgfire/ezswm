import { readJson } from '../../storage/jsonStorage'

const ENTITY_FILE_MAP: Record<string, string> = {
  switches: 'switches.json',
  vlans: 'vlans.json',
  networks: 'networks.json',
  'ip-allocations': 'ipAllocations.json',
  'ip-ranges': 'ipRanges.json',
  'layout-templates': 'layoutTemplates.json',
  users: 'users.json'
}

export default defineEventHandler((event) => {
  const entity = event.context.params?.entity
  if (!entity || !ENTITY_FILE_MAP[entity]) {
    throw createError({ statusCode: 400, message: `Unknown entity: ${entity}. Valid: ${Object.keys(ENTITY_FILE_MAP).join(', ')}` })
  }

  const data = readJson(ENTITY_FILE_MAP[entity])

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="ezswm-${entity}-${new Date().toISOString().slice(0, 10)}.json"`)

  return data
})
