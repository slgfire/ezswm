import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

import { runJsonToPrismaMigration } from '../server/migrations/jsonToPrisma'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function writeJson(dir: string, name: string, data: unknown) {
  writeFileSync(join(dir, name), JSON.stringify(data, null, 2))
}

async function freshPrismaClient(dbFile: string): Promise<PrismaClient> {
  // Apply the schema to a fresh SQLite file via prisma's migration runner.
  // Spawning the CLI is slow (~1-2s) but keeps the test fully self-contained.
  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: `file:${dbFile}` },
    stdio: 'pipe',
    cwd: process.cwd()
  })
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbFile}` }) })
}

describe('jsonToPrisma migration', () => {
  let dataDir: string
  let dbFile: string
  let prisma: PrismaClient

  beforeEach(async () => {
    dataDir = mkdtempSync(join(tmpdir(), 'ezswm-mig-data-'))
    const dbDir = mkdtempSync(join(tmpdir(), 'ezswm-mig-db-'))
    dbFile = join(dbDir, 'test.sqlite')
    prisma = await freshPrismaClient(dbFile)
  })

  afterEach(async () => {
    await prisma.$disconnect()
    rmSync(dataDir, { recursive: true, force: true })
    rmSync(dbFile, { force: true })
  })

  it('migrates a complete mini-dataset with cross-refs preserved', async () => {
    // --- Fixtures ---
    const oldSiteId = 'site-old-1'
    const oldUserId = 'user-old-1'
    const oldTemplateId = 'tpl-old-1'
    const oldSwitchId = 'sw-old-1'
    const oldPortA = 'p-old-A'
    const oldPortB = 'p-old-B'
    const oldVlanId = 'vlan-old-1'
    const oldNetworkId = 'net-old-1'
    const oldAllocId = 'alloc-old-1'
    const oldRangeId = 'range-old-1'
    const oldLagId = 'lag-old-1'
    const oldTokenId = 'tok-old-1'
    const oldActivityId = 'act-old-1'

    writeJson(dataDir, 'sites.json', [{
      id: oldSiteId, name: 'Default', description: 'home',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }])

    writeJson(dataDir, 'users.json', [{
      id: oldUserId, username: 'admin', display_name: 'Admin',
      password_hash: 'hash', role: 'admin', language: 'en', is_setup_user: true,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }])

    writeJson(dataDir, 'settings.json', {
      app_name: 'ezSWM', app_logo_url: null, default_vlan: null,
      default_port_status: 'down', port_speeds: ['1G', '10G'],
      setup_completed: true, sites_initialized: true
    })

    writeJson(dataDir, 'layout-templates.json', [{
      id: oldTemplateId, name: 'C2960', manufacturer: 'Cisco', model: '2960-24T',
      units: [{ unit_number: 1, blocks: [{ id: 'blk-1', type: 'rj45', count: 24, start_index: 1, rows: 2 }] }],
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }])

    writeJson(dataDir, 'switches.json', [{
      id: oldSwitchId, site_id: oldSiteId, name: 'core-01',
      layout_template_id: oldTemplateId,
      tags: ['core', 'rack-1'],
      configured_vlans: [10, 20],
      is_favorite: true,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      ports: [
        { id: oldPortA, unit: 1, index: 1, type: 'rj45', status: 'up',
          tagged_vlans: [10, 20], lag_group_id: oldLagId, connected_allocation_id: oldAllocId },
        { id: oldPortB, unit: 1, index: 2, type: 'rj45', status: 'up',
          tagged_vlans: [], connected_port_id: oldPortA, poe: { type: '802.3at', max_watts: 30 } }
      ]
    }])

    writeJson(dataDir, 'vlans.json', [{
      id: oldVlanId, site_id: oldSiteId, vlan_id: 100, name: 'Mgmt',
      status: 'active', color: '#3B82F6', is_favorite: false,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }])

    writeJson(dataDir, 'networks.json', [{
      id: oldNetworkId, site_id: oldSiteId, name: 'Server-Net', vlan_id: oldVlanId,
      subnet: '10.0.1.0/24', gateway: '10.0.1.1', dns_servers: ['1.1.1.1'],
      is_favorite: false,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }])

    writeJson(dataDir, 'ip-allocations.json', [{
      id: oldAllocId, network_id: oldNetworkId, ip_address: '10.0.1.10',
      hostname: 'server01', mac_address: '00:11:22:33:44:55',
      device_type: 'server', status: 'active',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }])

    writeJson(dataDir, 'ip-ranges.json', [{
      id: oldRangeId, network_id: oldNetworkId,
      start_ip: '10.0.1.100', end_ip: '10.0.1.200', type: 'dhcp',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }])

    writeJson(dataDir, 'lag-groups.json', [{
      id: oldLagId, switch_id: oldSwitchId, name: 'lag1',
      port_ids: [oldPortA], description: 'uplink',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }])

    writeJson(dataDir, 'public-tokens.json', [{
      id: oldTokenId, switch_id: oldSwitchId, token: 'tk_abc123',
      created_at: '2026-01-01T00:00:00Z', revoked_at: null, last_access_at: null
    }])

    writeJson(dataDir, 'topology-layouts.json', {
      [oldSiteId]: {
        node_positions: { [oldSwitchId]: { x: 100, y: 200 } },
        updated_at: '2026-01-01T00:00:00Z'
      }
    })

    writeJson(dataDir, 'activity.json', [{
      id: oldActivityId, user_id: oldUserId, action: 'update',
      entity_type: 'network', entity_id: oldNetworkId, entity_name: 'Server-Net',
      changes: { name: { from: 'old', to: 'Server-Net' }, vlan_id: { from: null, to: oldVlanId } },
      previous_state: { id: oldNetworkId, name: 'old', site_id: oldSiteId, vlan_id: null },
      timestamp: '2026-01-02T00:00:00Z'
    }])

    // --- Run ---
    const result = await runJsonToPrismaMigration({ prisma, dataDir })

    expect(result.counts).toMatchObject({
      sites: 1, users: 1, settings: 1, templates: 1, switches: 1, vlans: 1,
      networks: 1, allocations: 1, ranges: 1, lagGroups: 1, ports: 2,
      tokens: 1, topologyLayouts: 1, activities: 1
    })

    // --- Verify cross-refs and ID format ---
    const site = await prisma.site.findFirstOrThrow()
    const sw = await prisma.switch.findFirstOrThrow()
    const vlan = await prisma.vlan.findFirstOrThrow()
    const net = await prisma.network.findFirstOrThrow()
    const alloc = await prisma.ipAllocation.findFirstOrThrow()
    const lag = await prisma.lagGroup.findFirstOrThrow()
    const ports = await prisma.port.findMany({ orderBy: { index: 'asc' } })
    const range = await prisma.ipRange.findFirstOrThrow()
    const token = await prisma.publicToken.findFirstOrThrow()
    const topo = await prisma.topologyLayout.findFirstOrThrow()
    const act = await prisma.activityEntry.findFirstOrThrow()
    const user = await prisma.user.findFirstOrThrow()

    // Every id is a UUIDv4, and none of them equals the old nanoid.
    for (const id of [site.id, sw.id, vlan.id, net.id, alloc.id, lag.id, range.id, token.id, act.id, user.id, ...ports.map(p => p.id)]) {
      expect(id).toMatch(UUID_RE)
    }

    // Cross-refs are consistently remapped.
    expect(sw.site_id).toBe(site.id)
    expect(vlan.site_id).toBe(site.id)
    expect(net.site_id).toBe(site.id)
    expect(net.vlan_id).toBe(vlan.id)
    expect(alloc.network_id).toBe(net.id)
    expect(range.network_id).toBe(net.id)
    expect(lag.switch_id).toBe(sw.id)
    expect(token.switch_id).toBe(sw.id)
    expect(topo.site_id).toBe(site.id)

    // Port FKs to other entities resolved.
    const [portA, portB] = ports
    expect(portA!.switch_id).toBe(sw.id)
    expect(portA!.lag_group_id).toBe(lag.id)
    expect(portA!.connected_allocation_id).toBe(alloc.id)
    expect(portB!.connected_port_id).toBe(portA!.id) // self-ref remapped
    expect(portB!.poe).toBe(JSON.stringify({ type: '802.3at', max_watts: 30 }))

    // JSON-stringified array fields round-trip.
    expect(JSON.parse(sw.tags)).toEqual(['core', 'rack-1'])
    expect(JSON.parse(sw.configured_vlans)).toEqual([10, 20])
    expect(JSON.parse(portA!.tagged_vlans)).toEqual([10, 20])
    expect(JSON.parse(net.dns_servers)).toEqual(['1.1.1.1'])

    // Topology positions are keyed by the new switch id.
    const positions = JSON.parse(topo.node_positions) as Record<string, { x: number; y: number }>
    expect(positions[sw.id]).toEqual({ x: 100, y: 200 })
    expect(positions[oldSwitchId]).toBeUndefined()

    // Activity log: user_id and entity_id remapped, plus deep-walked changes/previous_state.
    expect(act.user_id).toBe(user.id)
    expect(act.entity_id).toBe(net.id)
    const changes = JSON.parse(act.changes!) as { vlan_id: { from: null; to: string } }
    expect(changes.vlan_id.to).toBe(vlan.id) // was oldVlanId, now new UUID
    const prev = JSON.parse(act.previous_state!) as { id: string; site_id: string; vlan_id: null }
    expect(prev.id).toBe(net.id)
    expect(prev.site_id).toBe(site.id)
    expect(prev.vlan_id).toBe(null)
  })

  it('rolls back atomically and leaves no rows on a malformed dataset', async () => {
    // Network references a non-existent site → silently dropped (not a hard fail).
    // But a switch with a missing layout_template_id that exists in templateMap NULL out — still fine.
    // To trigger a hard fail, push a duplicate primary key on users (manually craft IDs to clash).
    writeJson(dataDir, 'sites.json', [{ id: 's1', name: 'S1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }])
    writeJson(dataDir, 'users.json', [
      { id: 'u1', username: 'shared', display_name: 'A', password_hash: 'x', role: 'admin', language: 'en', is_setup_user: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'u2', username: 'shared', display_name: 'B', password_hash: 'y', role: 'viewer', language: 'en', is_setup_user: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } // duplicate unique username
    ])
    // Provide stubs for the rest so reads don't fail.
    for (const f of ['layout-templates.json', 'switches.json', 'vlans.json', 'networks.json',
      'ip-allocations.json', 'ip-ranges.json', 'lag-groups.json', 'public-tokens.json', 'activity.json']) {
      writeJson(dataDir, f, [])
    }
    writeJson(dataDir, 'topology-layouts.json', {})

    await expect(runJsonToPrismaMigration({ prisma, dataDir })).rejects.toThrow()

    // Transaction rolled back: no users, no sites persisted.
    expect(await prisma.user.count()).toBe(0)
    expect(await prisma.site.count()).toBe(0)
  })

  it('skips silently when a file is missing', async () => {
    mkdirSync(dataDir, { recursive: true })
    // Only seed sites.json; everything else missing.
    writeJson(dataDir, 'sites.json', [{ id: 's1', name: 'S1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }])

    const result = await runJsonToPrismaMigration({ prisma, dataDir })
    expect(result.counts.sites).toBe(1)
    expect(result.counts.users).toBe(0)
    expect(result.counts.activities).toBe(0)
  })
})
