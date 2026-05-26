import { ensureDataDir, initializeFile, readJson, writeJson } from '../storage/jsonStorage'
import { DEFAULT_SETTINGS } from '../../types/settings'
import type { AppSettings } from '../../types/settings'

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
    'ip-allocations.json',
    'ip-ranges.json',
    'layout-templates.json',
    'lag-groups.json',
    'activity.json',
    'sites.json',
    'public-tokens.json'
  ]

  for (const file of arrayFiles) {
    initializeFile(file, [])
  }

  initializeFile('settings.json', DEFAULT_SETTINGS)
  initializeFile('topology-layouts.json', {})

  // Backfill new fields on existing settings.json (older installs).
  // If sites already exist, treat the installation as already initialized
  // so we don't bounce returning users into the setup wizard.
  const currentSettings = readJson<Partial<AppSettings>>('settings.json')
  const sites = readJson<unknown[]>('sites.json')
  const needsBackfill = currentSettings.sites_initialized === undefined
  if (needsBackfill) {
    writeJson('settings.json', {
      ...DEFAULT_SETTINGS,
      ...currentSettings,
      sites_initialized: sites.length > 0
    })
  }

  console.log(`[ezSWM] Data directory initialized: ${config.dataDir}`)
})
