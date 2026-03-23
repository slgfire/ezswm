import { readJson, writeJson } from '../../storage/jsonStorage'
import { nanoid } from 'nanoid'

const ENTITY_FILE_MAP: Record<string, string> = {
  switches: 'switches.json',
  vlans: 'vlans.json',
  networks: 'networks.json',
  'ip-allocations': 'ipAllocations.json',
  'layout-templates': 'layoutTemplates.json'
}

export default defineEventHandler(async (event) => {
  const entity = event.context.params?.entity
  if (!entity || !ENTITY_FILE_MAP[entity]) {
    throw createError({ statusCode: 400, message: `Unknown entity: ${entity}` })
  }

  const body = await readBody(event)
  if (!Array.isArray(body)) {
    throw createError({ statusCode: 400, message: 'Request body must be a JSON array' })
  }

  if (body.length > 5000) {
    throw createError({ statusCode: 400, message: 'Maximum 5000 rows allowed' })
  }

  const fileName = ENTITY_FILE_MAP[entity]
  const existing = readJson<any[]>(fileName)
  const now = new Date().toISOString()

  let imported = 0
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < body.length; i++) {
    try {
      const item = {
        ...body[i],
        id: nanoid(),
        created_at: now,
        updated_at: now
      }
      existing.push(item)
      imported++
    } catch (e: any) {
      errors.push({ row: i + 1, message: e.message })
    }
  }

  writeJson(fileName, existing)

  return { imported, errors, total: body.length }
})
