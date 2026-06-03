import { prisma } from '../db/client'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  let dbOk = false
  try {
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch {
    dbOk = false
  }
  return {
    status: dbOk ? 'ok' : 'degraded',
    version: config.public.appVersion,
    uptime: Math.floor(process.uptime()),
    data_dir: config.dataDir,
    database_ok: dbOk
  }
})
