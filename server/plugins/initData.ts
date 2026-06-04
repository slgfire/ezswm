import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { prisma } from '../db/client'
import { runJsonToPrismaMigration } from '../migrations/jsonToPrisma'
import { cleanupMigrationPlaceholderSlugs } from '../utils/slugPlaceholderCleanup'

// Legacy JSON files the migration looks for. If any of these are present in
// dataDir AND the database is empty, we trigger the one-shot import.
const LEGACY_FILES = [
  'sites.json',
  'switches.json',
  'vlans.json',
  'networks.json',
  'ip-allocations.json',
  'ip-ranges.json',
  'lag-groups.json',
  'public-tokens.json',
  'users.json',
  'activity.json',
  'layout-templates.json',
  'settings.json',
  'topology-layouts.json'
]

function hasLegacyJsonFiles(dataDir: string): boolean {
  return LEGACY_FILES.some(name => existsSync(join(dataDir, name)))
}

async function isDatabaseEmpty(): Promise<boolean> {
  // Sites is the root of every meaningful piece of data — if there are any
  // sites, the DB is in use.
  const [sites, users, activities] = await Promise.all([
    prisma.site.count(),
    prisma.user.count(),
    prisma.activityEntry.count()
  ])
  return sites === 0 && users === 0 && activities === 0
}

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  if (!config.jwtSecret || config.jwtSecret === 'change-me-to-a-random-secret-in-production') {
    console.warn('[ezSWM] WARNING: JWT_SECRET is not set or using default value. Set a secure secret in production!')
  }

  try {
    await prisma.$connect()
  } catch (err) {
    console.error('[ezSWM] Failed to connect to database. The app will not function correctly.', err)
    return
  }

  const dataDir = config.dataDir
  let migrated = false

  if (await isDatabaseEmpty() && hasLegacyJsonFiles(dataDir)) {
    console.log(`[ezSWM] Empty database + legacy JSON files detected in ${dataDir}. Starting one-shot migration to SQLite...`)
    try {
      const result = await runJsonToPrismaMigration({ prisma, dataDir })
      const total = Object.values(result.counts).reduce((s, n) => s + n, 0)
      console.log(`[ezSWM] Migration complete: ${total} records imported.`)
      console.log(`[ezSWM] Per-entity counts: ${JSON.stringify(result.counts)}`)
      console.log(`[ezSWM] Original JSON files archived to ${result.archived}`)
      migrated = true
    } catch (err) {
      console.error('[ezSWM] Migration failed. The database is empty and the JSON files were not moved. Investigate the error and restart.', err)
      // Don't crash the app — let the user fix the data and restart.
      return
    }
  }

  // Ensure a singleton AppSettings row exists. The migration writes one if a
  // settings.json was present; on a fresh install we create defaults here.
  const settingsCount = await prisma.appSettings.count()
  if (settingsCount === 0) {
    await prisma.appSettings.create({
      data: {
        id: 'singleton',
        app_name: 'ezSWM',
        app_logo_url: null,
        default_vlan: null,
        default_port_status: 'down',
        port_speeds: JSON.stringify(['100M', '1G', '2.5G', '10G', '100G']),
        setup_completed: false,
        sites_initialized: false
      }
    })
  }

  // Legacy backfill: if older installs had sites but settings.sites_initialized
  // never got set, treat the install as initialized so returning users don't
  // bounce to the setup wizard.
  if (!migrated) {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } })
    if (settings && !settings.sites_initialized) {
      const siteCount = await prisma.site.count()
      if (siteCount > 0) {
        await prisma.appSettings.update({
          where: { id: 'singleton' },
          data: { sites_initialized: true }
        })
      }
    }
  }

  // Tidy up SQL-migration placeholder slugs left behind by the 0.22 schema
  // migration. Idempotent: a clean install or already-cleaned DB results in
  // a no-op zero-update pass.
  try {
    const cleaned = await cleanupMigrationPlaceholderSlugs(prisma)
    const total = cleaned.sites + cleaned.switches + cleaned.networks
    if (total > 0) {
      console.log(`[ezSWM] Cleaned ${total} migration-placeholder slug(s): ${JSON.stringify(cleaned)}`)
    }
  } catch (err) {
    console.warn('[ezSWM] Slug cleanup pass failed (non-fatal):', err)
  }

  console.log(`[ezSWM] Database ready (data dir: ${dataDir})`)
})
