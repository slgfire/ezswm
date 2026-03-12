import type { Switch } from '~/types/models'
import { useStorage } from '~/server/storage'
import { normalizeName } from '~/server/storage/shared/utils'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Switch> & { locationName?: string; rackName?: string }>(event)
  if (!body.name || !body.vendor || !body.model || !body.managementIp || !body.portCount) {
    throw createError({ statusCode: 400, statusMessage: 'Required fields are missing.' })
  }

  const storage = useStorage()

  const locationName = body.locationName ? normalizeName(body.locationName) : ''
  let locationId = body.locationId || ''

  if (locationName) {
    const found = await storage.locations.getByName(locationName)
    if (found) {
      locationId = found.id
    } else {
      const created = await storage.locations.create({ name: locationName })
      locationId = created.id
    }
  }

  const rackName = body.rackName ? normalizeName(body.rackName) : ''
  let rackId = body.rackId || ''

  if (rackName) {
    if (!locationId) {
      throw createError({ statusCode: 400, statusMessage: 'A location must be selected before creating or choosing a rack.' })
    }

    const rackInLocation = await storage.racks.getByNameInLocation(locationId, rackName)
    if (rackInLocation) {
      rackId = rackInLocation.id
    } else {
      const created = await storage.racks.create({ name: rackName, locationId })
      rackId = created.id
    }
  }

  const created = await storage.switches.create({
    name: body.name,
    vendor: body.vendor,
    model: body.model,
    modelId: body.modelId,
    locationId: locationId || undefined,
    rackId: rackId || undefined,
    rackPosition: body.rackPosition,
    managementIp: body.managementIp,
    serialNumber: body.serialNumber,
    portCount: body.portCount,
    description: body.description,
    status: body.status || 'planned',
    tags: body.tags || [],
    layoutTemplateId: body.layoutTemplateId,
    layoutOverride: body.layoutOverride,
    ports: body.ports || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  return created
})
