import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

interface TestRuntimeConfig {
  dataDir: string
  jwtSecret: string
}

const DEFAULT_CONFIG: TestRuntimeConfig = {
  dataDir: '/tmp/vitest-default',
  jwtSecret: 'test-secret-key',
}

const _config: TestRuntimeConfig = { ...DEFAULT_CONFIG }

export function setTestRuntimeConfig(overrides: Partial<TestRuntimeConfig>): void {
  Object.assign(_config, overrides)
}

export function resetTestRuntimeConfig(): void {
  Object.assign(_config, { ...DEFAULT_CONFIG })
}

export function getTestRuntimeConfig(): TestRuntimeConfig {
  return { ..._config }
}

/**
 * Seed a JSON file in the given data directory. Kept around for the few tests
 * (idMapping, jsonToPrisma) that still drive the JSON migration path directly.
 */
export function seedJsonFile(dataDir: string, fileName: string, data: unknown = []): void {
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(join(dataDir, fileName), JSON.stringify(data, null, 2))
}

// ---------------------------------------------------------------------------
// Prisma test client — provisions a fresh SQLite file per test file and lets
// each test reset the contents without paying the migrate-deploy cost again.
// ---------------------------------------------------------------------------

export interface TestPrismaContext {
  prisma: PrismaClient
  /** Wipe every table in reverse FK order. Call from `beforeEach`. */
  resetDb: () => Promise<void>
  /** Tear down the temp DB. Call from `afterAll`. */
  cleanup: () => Promise<void>
}

/**
 * Create a temporary SQLite database with the schema applied, return a Prisma
 * client pointed at it, plus helpers to reset and dispose. Use in `beforeAll`;
 * pair with `globalThis.__prismaTestClient = prisma` so repository singletons
 * route through it.
 *
 * Spawning the CLI to run `prisma migrate deploy` costs ~1–2s per setup. We
 * pay it once per test file (in `beforeAll`) and then reset rows between
 * tests, which is orders of magnitude faster than provisioning per test.
 */
export async function createTestPrisma(): Promise<TestPrismaContext> {
  const dbDir = mkdtempSync(join(tmpdir(), 'ezswm-test-db-'))
  const dbFile = join(dbDir, 'test.sqlite')

  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: `file:${dbFile}` },
    stdio: 'pipe',
    cwd: process.cwd()
  })

  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbFile}` }) })

  async function resetDb(): Promise<void> {
    // FK-safe order — leaves with the most dependents first.
    await prisma.$transaction([
      prisma.activityEntry.deleteMany(),
      prisma.topologyLayout.deleteMany(),
      prisma.publicToken.deleteMany(),
      prisma.port.deleteMany(),
      prisma.lagGroup.deleteMany(),
      prisma.ipAllocation.deleteMany(),
      prisma.ipRange.deleteMany(),
      prisma.network.deleteMany(),
      prisma.vlan.deleteMany(),
      prisma.switch.deleteMany(),
      prisma.layoutTemplate.deleteMany(),
      prisma.appSettings.deleteMany(),
      prisma.user.deleteMany(),
      prisma.site.deleteMany()
    ])
  }

  async function cleanup(): Promise<void> {
    await prisma.$disconnect()
    rmSync(dbDir, { recursive: true, force: true })
  }

  return { prisma, resetDb, cleanup }
}

// ---------------------------------------------------------------------------
// Seed helpers — quick row factories with defaults wherever a test doesn't
// care about a particular field.
// ---------------------------------------------------------------------------

const nowIso = () => new Date().toISOString()

export async function seedSite(prisma: PrismaClient, overrides: { id?: string; slug?: string; name?: string; description?: string | null } = {}): Promise<{ id: string }> {
  const id = overrides.id ?? randomUUID()
  const slug = overrides.slug ?? `test-${id.slice(0, 6)}`
  await prisma.site.create({
    data: {
      id,
      slug,
      name: overrides.name ?? 'Test Site',
      description: overrides.description ?? null,
      created_at: nowIso(),
      updated_at: nowIso()
    }
  })
  return { id }
}

export async function seedNetwork(prisma: PrismaClient, overrides: {
  id?: string
  site_id?: string
  slug?: string
  name?: string
  subnet?: string
  gateway?: string | null
  vlan_id?: string | null
  dns_servers?: string[]
} = {}): Promise<{ id: string }> {
  const id = overrides.id ?? randomUUID()
  const site_id = overrides.site_id ?? (await seedSite(prisma)).id
  const slug = overrides.slug ?? `net-${id.slice(0, 6)}`
  await prisma.network.create({
    data: {
      id,
      site_id,
      slug,
      name: overrides.name ?? 'Test Network',
      subnet: overrides.subnet ?? '10.0.1.0/24',
      gateway: overrides.gateway ?? '10.0.1.1',
      vlan_id: overrides.vlan_id ?? null,
      dns_servers: JSON.stringify(overrides.dns_servers ?? []),
      description: null,
      is_favorite: false,
      created_at: nowIso(),
      updated_at: nowIso()
    }
  })
  return { id }
}

export async function seedIpRange(prisma: PrismaClient, overrides: {
  id?: string
  network_id: string
  start_ip: string
  end_ip: string
  type?: string
}): Promise<{ id: string }> {
  const id = overrides.id ?? randomUUID()
  await prisma.ipRange.create({
    data: {
      id,
      network_id: overrides.network_id,
      start_ip: overrides.start_ip,
      end_ip: overrides.end_ip,
      type: overrides.type ?? 'dhcp',
      description: null,
      created_at: nowIso(),
      updated_at: nowIso()
    }
  })
  return { id }
}

export async function seedSwitch(prisma: PrismaClient, overrides: {
  id?: string
  site_id?: string
  slug?: string
  name?: string
  layout_template_id?: string | null
  stack_size?: number | null
} = {}): Promise<{ id: string }> {
  const id = overrides.id ?? randomUUID()
  const site_id = overrides.site_id ?? (await seedSite(prisma)).id
  const slug = overrides.slug ?? `sw-${id.slice(0, 6)}`
  await prisma.switch.create({
    data: {
      id,
      site_id,
      slug,
      name: overrides.name ?? 'Test Switch',
      tags: JSON.stringify([]),
      configured_vlans: JSON.stringify([]),
      is_favorite: false,
      layout_template_id: overrides.layout_template_id ?? null,
      stack_size: overrides.stack_size ?? null,
      created_at: nowIso(),
      updated_at: nowIso()
    }
  })
  return { id }
}
