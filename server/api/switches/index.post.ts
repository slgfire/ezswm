import type { Switch } from '~/types/models'
import { newId, readStore, withTimestamps, writeStore } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Switch> & { locationName?: string; rackName?: string }>(event)
  if (!body.name || !body.vendor || !body.model || !body.managementIp || !body.portCount) {
    throw createError({ statusCode: 400, statusMessage: 'Pflichtfelder fehlen.' })
  }

  const store = await readStore()

  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ')
  const matchByName = <T extends { name: string }>(items: T[], name: string) => {
    const normalized = normalize(name).toLocaleLowerCase()
    return items.find((item) => normalize(item.name).toLocaleLowerCase() === normalized)
  }

  const locationName = body.locationName ? normalize(body.locationName) : ''
  let locationId = body.locationId || ''

  if (locationName) {
    const found = matchByName(store.locations, locationName)
    if (found) {
      locationId = found.id
    } else {
      locationId = newId('loc')
      store.locations.push({ id: locationId, name: locationName })
    }
  }

  const rackName = body.rackName ? normalize(body.rackName) : ''
  let rackId = body.rackId || ''

  if (rackName) {
    if (!locationId) {
      throw createError({ statusCode: 400, statusMessage: 'Für ein Rack muss zuerst ein Standort angegeben werden.' })
    }

    const rackInLocation = store.racks.find((rack) => rack.locationId === locationId
      && normalize(rack.name).toLocaleLowerCase() === rackName.toLocaleLowerCase())

    if (rackInLocation) {
      rackId = rackInLocation.id
    } else {
      rackId = newId('rack')
      store.racks.push({ id: rackId, name: rackName, locationId })
    }
  }

  const id = newId('sw')
  const ports = body.ports?.length
    ? body.ports.map((port) => ({ ...port, switchId: id }))
    : Array.from({ length: body.portCount }, (_, i) => ({ switchId: id, portNumber: i + 1, status: 'free' as const, mediaType: 'RJ45' as const }))

  const created = withTimestamps(undefined, {
    id,
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
    ports
  })

  store.switches.push(created)
  await writeStore(store)
  return created
})
