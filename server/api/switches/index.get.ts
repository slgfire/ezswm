import { readStore } from '~/server/utils/storage'

export default defineEventHandler(async () => {
  const store = await readStore()
  return store.switches
})
