import { useStorage } from '~/server/storage'

export default defineEventHandler(async () => {
  const store = await useStorage().readRawStore()
  return {
    locations: store.locations,
    racks: store.racks,
    vendors: store.vendors,
    switchModels: store.switchModels,
    layoutTemplates: store.layoutTemplates
  }
})
