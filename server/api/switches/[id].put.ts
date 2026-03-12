import type { Switch } from '~/types/models'
import { useStorage } from '~/server/storage'
import { normalizeName } from '~/server/storage/shared/utils'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Switch ID is required.' })
  }

  const body = await readBody<Partial<Switch> & { locationName?: string; rackName?: string }>(event)
  const storage = useStorage()
  const current = await storage.switches.getById(id)

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found.' })
  }

  const locationName = body.locationName ? normalizeName(body.locationName) : ''
  let locationId = body.locationId ?? current.locationId ?? ''

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
  let rackId = body.rackId ?? current.rackId ?? ''

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

  if (locationId && rackId) {
    const rack = await storage.racks.getById(rackId)
    if (rack && rack.locationId !== locationId) {
      rackId = ''
    }
  }

  const updated = await storage.switches.update(id, {
    ...body,
    locationId: locationId || undefined,
    rackId: rackId || undefined
  })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found.' })
  }

  return updated
})
