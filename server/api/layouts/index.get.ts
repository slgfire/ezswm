import { useStorage } from '~/server/storage'

export default defineEventHandler(async () => {
  return useStorage().layouts.list()
})
