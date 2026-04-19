import { isDataDirWritable } from '../storage/jsonStorage'

export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    status: 'ok',
    version: config.public.appVersion,
    uptime: Math.floor(process.uptime()),
    data_dir: config.dataDir,
    data_writable: isDataDirWritable()
  }
})
