import { seedIfEmpty } from '../storage/seed'

export default defineNitroPlugin(async () => {
  await seedIfEmpty()
})
