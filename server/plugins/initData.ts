import { ensureDataDir, initializeFile } from '../storage/jsonStorage'

const DEFAULT_SETTINGS = {
  app_name: 'ezSWM',
  app_logo_url: null,
  default_vlan: null,
  default_port_status: 'down',
  pagination_size: 25,
  port_speeds: ['100M', '1G', '2.5G', '10G', '100G'],
  setup_completed: false
}

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  // Warn about JWT_SECRET
  if (!config.jwtSecret || config.jwtSecret === 'change-me-to-a-random-secret-in-production') {
    console.warn('[ezSWM] WARNING: JWT_SECRET is not set or using default value. Set a secure secret in production!')
  }

  // Initialize data directory
  ensureDataDir()

  // Initialize JSON files
  const arrayFiles = [
    'users.json',
    'switches.json',
    'vlans.json',
    'networks.json',
    'ipAllocations.json',
    'ipRanges.json',
    'layoutTemplates.json',
    'lagGroups.json',
    'activity.json',
    'sites.json',
    'publicTokens.json'
  ]

  for (const file of arrayFiles) {
    initializeFile(file, [])
  }

  initializeFile('settings.json', DEFAULT_SETTINGS)

  console.log(`[ezSWM] Data directory initialized: ${config.dataDir}`)
})
