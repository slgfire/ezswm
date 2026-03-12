import type { Switch } from '~/types/models'
import { newId, readStore, withTimestamps, writeStore } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<Partial<Switch> & { locationName?: string; rackName?: string }>(event)
  const store = await readStore()
  const idx = store.switches.findIndex((sw) => sw.id === id)
  if (idx < 0) {
    throw createError({ statusCode: 404, statusMessage: 'Switch nicht gefunden.' })
  }

  const current = store.switches[idx]
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ')
  const matchByName = <T extends { name: string }>(items: T[], name: string) => {
    const normalized = normalize(name).toLocaleLowerCase()
    return items.find((item) => normalize(item.name).toLocaleLowerCase() === normalized)
  }

  const locationName = body.locationName ? normalize(body.locationName) : ''
  let locationId = body.locationId ?? current.locationId ?? ''

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
  let rackId = body.rackId ?? current.rackId ?? ''

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

  if (locationId && rackId) {
    const rack = store.racks.find((entry) => entry.id === rackId)
    if (rack && rack.locationId !== locationId) {
      rackId = ''
    }
  }

  const merged = withTimestamps(current, {
    ...current,
    ...body,
    id: current.id,
    locationId: locationId || undefined,
    rackId: rackId || undefined,
    ports: (body.ports || current.ports).map((port) => ({ ...port, switchId: current.id }))
  })

  store.switches[idx] = merged
  await writeStore(store)
  return merged
})
