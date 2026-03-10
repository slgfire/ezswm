import { readStore } from '~/server/utils/storage'

export default defineEventHandler(async () => {
  const store = await readStore()
  return {
    locations: store.locations,
    racks: store.racks,
    vendors: store.vendors,
    switchModels: store.switchModels,
    layoutTemplates: store.layoutTemplates
  }
})
