import { isDataDirWritable } from '../storage/jsonStorage'

export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    status: 'ok',
    version: '0.1.0',
    uptime: Math.floor(process.uptime()),
    data_dir: config.dataDir,
    data_writable: isDataDirWritable()
  }
})
