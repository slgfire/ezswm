import type { Switch } from '~/types/models'
import { newId, readStore, withTimestamps, writeStore } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Switch>>(event)
  if (!body.name || !body.vendor || !body.model || !body.managementIp || !body.portCount) {
    throw createError({ statusCode: 400, statusMessage: 'Pflichtfelder fehlen.' })
  }

  const store = await readStore()
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
    locationId: body.locationId,
    rackId: body.rackId,
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
