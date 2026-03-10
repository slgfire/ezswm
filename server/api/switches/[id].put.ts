import type { Switch } from '~/types/models'
import { readStore, withTimestamps, writeStore } from '~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<Partial<Switch>>(event)
  const store = await readStore()
  const idx = store.switches.findIndex((sw) => sw.id === id)
  if (idx < 0) {
    throw createError({ statusCode: 404, statusMessage: 'Switch nicht gefunden.' })
  }

  const current = store.switches[idx]
  const merged = withTimestamps(current, {
    ...current,
    ...body,
    id: current.id,
    ports: (body.ports || current.ports).map((port) => ({ ...port, switchId: current.id }))
  })

  store.switches[idx] = merged
  await writeStore(store)
  return merged
})
