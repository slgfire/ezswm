import { existsSync } from 'node:fs'
import { readFile, mkdir, rename, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { PrismaClient } from '@prisma/client'

import { buildIdMap, mergeIdMaps, remapJson } from '../utils/idMapping'
import { slugify } from '../utils/slugify'

/**
 * Mint slugs inside the migration. Collisions are resolved by suffixing -2/-3
 * within the per-scope `seen` set so we never violate the unique constraint.
 */
function mintSlug(seen: Set<string>, source: string): string {
  const base = slugify(source)
  if (!seen.has(base)) {
    seen.add(base)
    return base
  }
  let counter = 2
  while (counter < 10_000) {
    const candidate = `${base}-${counter}`
    if (!seen.has(candidate)) {
      seen.add(candidate)
      return candidate
    }
    counter++
  }
  // Should be unreachable in practice — fallback keeps us deterministic.
  const fallback = `${base}-${Date.now()}`
  seen.add(fallback)
  return fallback
}

// ---------------------------------------------------------------------------
// Types reflecting the legacy JSON shapes (lenient: data is user-owned).
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>

interface LegacySite extends Json { id: string }
interface LegacyUser extends Json { id: string }
interface LegacyVlan extends Json { id: string; site_id?: string }
interface LegacyNetwork extends Json { id: string; site_id?: string; vlan_id?: string }
interface LegacyAllocation extends Json { id: string; network_id?: string }
interface LegacyRange extends Json { id: string; network_id?: string }
interface LegacyLag extends Json { id: string; switch_id?: string; port_ids?: string[] }
interface LegacyTemplate extends Json { id: string }
interface LegacyToken extends Json { id: string; switch_id?: string }
interface LegacyActivity extends Json { id: string; user_id?: string; entity_id?: string }
interface LegacyTopology extends Json { node_positions?: Record<string, unknown>; updated_at?: string }
interface LegacyPort extends Json { id: string }
interface LegacySwitch extends Json {
  id: string
  site_id?: string
  layout_template_id?: string
  ports?: LegacyPort[]
}

interface MigrationResult {
  counts: Record<string, number>
  archived: string
}

const JSON_FILES = [
  'sites.json',
  'users.json',
  'settings.json',
  'layout-templates.json',
  'switches.json',
  'vlans.json',
  'networks.json',
  'ip-allocations.json',
  'ip-ranges.json',
  'lag-groups.json',
  'public-tokens.json',
  'topology-layouts.json',
  'activity.json'
] as const

async function readJsonFile<T>(dataDir: string, name: string, fallback: T): Promise<T> {
  const path = join(dataDir, name)
  if (!existsSync(path)) return fallback
  const buf = await readFile(path, 'utf-8')
  if (!buf.trim()) return fallback
  return JSON.parse(buf) as T
}

function pickString(obj: Json, key: string, fallback = ''): string {
  const v = obj[key]
  return typeof v === 'string' ? v : fallback
}

function pickStringOrNull(obj: Json, key: string): string | null {
  const v = obj[key]
  return typeof v === 'string' ? v : null
}

function pickNumberOrNull(obj: Json, key: string): number | null {
  const v = obj[key]
  return typeof v === 'number' ? v : null
}

function pickBool(obj: Json, key: string, fallback = false): boolean {
  const v = obj[key]
  return typeof v === 'boolean' ? v : fallback
}

function stringifyOrDefault(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback
  return JSON.stringify(value)
}

function nowIso(): string {
  return new Date().toISOString()
}

function getCreatedAt(obj: Json): string {
  return pickString(obj, 'created_at') || nowIso()
}

function getUpdatedAt(obj: Json): string {
  return pickString(obj, 'updated_at') || getCreatedAt(obj)
}

// ---------------------------------------------------------------------------
// Migration entry point
// ---------------------------------------------------------------------------

export async function runJsonToPrismaMigration(opts: {
  prisma: PrismaClient
  dataDir: string
}): Promise<MigrationResult> {
  const { prisma, dataDir } = opts

  // 1. Load everything into memory.
  const sites = await readJsonFile<LegacySite[]>(dataDir, 'sites.json', [])
  const users = await readJsonFile<LegacyUser[]>(dataDir, 'users.json', [])
  const settings = await readJsonFile<Json | null>(dataDir, 'settings.json', null)
  const templates = await readJsonFile<LegacyTemplate[]>(dataDir, 'layout-templates.json', [])
  const switches = await readJsonFile<LegacySwitch[]>(dataDir, 'switches.json', [])
  const vlans = await readJsonFile<LegacyVlan[]>(dataDir, 'vlans.json', [])
  const networks = await readJsonFile<LegacyNetwork[]>(dataDir, 'networks.json', [])
  const allocations = await readJsonFile<LegacyAllocation[]>(dataDir, 'ip-allocations.json', [])
  const ranges = await readJsonFile<LegacyRange[]>(dataDir, 'ip-ranges.json', [])
  const lagGroups = await readJsonFile<LegacyLag[]>(dataDir, 'lag-groups.json', [])
  const tokens = await readJsonFile<LegacyToken[]>(dataDir, 'public-tokens.json', [])
  const topologyLayouts = await readJsonFile<Record<string, LegacyTopology>>(
    dataDir, 'topology-layouts.json', {}
  )
  const activities = await readJsonFile<LegacyActivity[]>(dataDir, 'activity.json', [])

  // 2. Build ID maps (old nanoid → new UUID).
  const siteMap = buildIdMap(sites)
  const userMap = buildIdMap(users)
  const templateMap = buildIdMap(templates)
  const switchMap = buildIdMap(switches)
  const ports: LegacyPort[] = switches.flatMap(s => (s.ports ?? []))
  const portMap = buildIdMap(ports)
  const vlanMap = buildIdMap(vlans)
  const networkMap = buildIdMap(networks)
  const allocationMap = buildIdMap(allocations)
  const rangeMap = buildIdMap(ranges)
  const lagMap = buildIdMap(lagGroups)
  const tokenMap = buildIdMap(tokens)
  const activityMap = buildIdMap(activities)
  const globalIdMap = mergeIdMaps(
    siteMap, userMap, templateMap, switchMap, portMap, vlanMap, networkMap,
    allocationMap, rangeMap, lagMap, tokenMap, activityMap
  )

  const counts: Record<string, number> = {}

  // 3. Run everything in a single transaction. SQLite rolls back atomically on
  //    any error, so a partial migration is impossible.
  await prisma.$transaction(async (tx) => {
    // --- Sites
    const siteSlugs = new Set<string>()
    for (const s of sites) {
      await tx.site.create({ data: {
        id: siteMap.get(s.id)!,
        slug: mintSlug(siteSlugs, pickString(s, 'name')),
        name: pickString(s, 'name'),
        description: pickStringOrNull(s, 'description'),
        created_at: getCreatedAt(s),
        updated_at: getUpdatedAt(s)
      } })
    }
    counts.sites = sites.length

    // --- Users
    for (const u of users) {
      await tx.user.create({ data: {
        id: userMap.get(u.id)!,
        username: pickString(u, 'username'),
        display_name: pickString(u, 'display_name'),
        password_hash: pickString(u, 'password_hash'),
        role: pickString(u, 'role', 'viewer'),
        language: pickString(u, 'language', 'en'),
        is_setup_user: pickBool(u, 'is_setup_user'),
        created_at: getCreatedAt(u),
        updated_at: getUpdatedAt(u)
      } })
    }
    counts.users = users.length

    // --- AppSettings (singleton)
    if (settings) {
      await tx.appSettings.create({ data: {
        id: 'singleton',
        app_name: pickString(settings, 'app_name', 'ezSWM'),
        app_logo_url: pickStringOrNull(settings, 'app_logo_url'),
        default_vlan: pickNumberOrNull(settings, 'default_vlan'),
        default_port_status: pickString(settings, 'default_port_status', 'down'),
        port_speeds: stringifyOrDefault(settings.port_speeds, '[]'),
        setup_completed: pickBool(settings, 'setup_completed'),
        sites_initialized: pickBool(settings, 'sites_initialized')
      } })
      counts.settings = 1
    } else {
      counts.settings = 0
    }

    // --- LayoutTemplates
    for (const t of templates) {
      await tx.layoutTemplate.create({ data: {
        id: templateMap.get(t.id)!,
        name: pickString(t, 'name'),
        manufacturer: pickStringOrNull(t, 'manufacturer'),
        model: pickStringOrNull(t, 'model'),
        description: pickStringOrNull(t, 'description'),
        datasheet_url: pickStringOrNull(t, 'datasheet_url'),
        airflow: pickStringOrNull(t, 'airflow'),
        units: stringifyOrDefault(t.units, '[]'),
        created_at: getCreatedAt(t),
        updated_at: getUpdatedAt(t)
      } })
    }
    counts.templates = templates.length

    // --- Switches
    const switchSlugs = new Map<string, Set<string>>() // site_id → seen slugs
    for (const sw of switches) {
      const siteId = typeof sw.site_id === 'string' ? siteMap.get(sw.site_id) : undefined
      if (!siteId) continue // orphan switch — skip silently
      const templateId = typeof sw.layout_template_id === 'string'
        ? templateMap.get(sw.layout_template_id) ?? null
        : null
      let scope = switchSlugs.get(siteId)
      if (!scope) { scope = new Set<string>(); switchSlugs.set(siteId, scope) }
      await tx.switch.create({ data: {
        id: switchMap.get(sw.id)!,
        site_id: siteId,
        slug: mintSlug(scope, pickString(sw, 'name')),
        name: pickString(sw, 'name'),
        model: pickStringOrNull(sw, 'model'),
        manufacturer: pickStringOrNull(sw, 'manufacturer'),
        serial_number: pickStringOrNull(sw, 'serial_number'),
        location: pickStringOrNull(sw, 'location'),
        rack_position: pickStringOrNull(sw, 'rack_position'),
        management_ip: pickStringOrNull(sw, 'management_ip'),
        firmware_version: pickStringOrNull(sw, 'firmware_version'),
        layout_template_id: templateId,
        stack_size: pickNumberOrNull(sw, 'stack_size'),
        role: pickStringOrNull(sw, 'role'),
        tags: stringifyOrDefault(sw.tags, '[]'),
        configured_vlans: stringifyOrDefault(sw.configured_vlans, '[]'),
        is_favorite: pickBool(sw, 'is_favorite'),
        sort_order: pickNumberOrNull(sw, 'sort_order'),
        notes: pickStringOrNull(sw, 'notes'),
        created_at: getCreatedAt(sw),
        updated_at: getUpdatedAt(sw)
      } })
    }
    counts.switches = switches.length

    // --- Vlans
    for (const v of vlans) {
      const siteId = typeof v.site_id === 'string' ? siteMap.get(v.site_id) : undefined
      if (!siteId) continue
      await tx.vlan.create({ data: {
        id: vlanMap.get(v.id)!,
        site_id: siteId,
        vlan_id: typeof v.vlan_id === 'number' ? v.vlan_id : 0,
        name: pickString(v, 'name'),
        description: pickStringOrNull(v, 'description'),
        status: pickString(v, 'status', 'active'),
        routing_device: pickStringOrNull(v, 'routing_device'),
        color: pickString(v, 'color', '#3B82F6'),
        is_favorite: pickBool(v, 'is_favorite'),
        created_at: getCreatedAt(v),
        updated_at: getUpdatedAt(v)
      } })
    }
    counts.vlans = vlans.length

    // --- Networks
    const networkSlugs = new Map<string, Set<string>>() // site_id → seen slugs
    for (const n of networks) {
      const siteId = typeof n.site_id === 'string' ? siteMap.get(n.site_id) : undefined
      if (!siteId) continue
      const vlanRef = typeof n.vlan_id === 'string' ? vlanMap.get(n.vlan_id) ?? null : null
      let scope = networkSlugs.get(siteId)
      if (!scope) { scope = new Set<string>(); networkSlugs.set(siteId, scope) }
      await tx.network.create({ data: {
        id: networkMap.get(n.id)!,
        site_id: siteId,
        slug: mintSlug(scope, pickString(n, 'name')),
        name: pickString(n, 'name'),
        vlan_id: vlanRef,
        subnet: pickString(n, 'subnet'),
        gateway: pickStringOrNull(n, 'gateway'),
        dns_servers: stringifyOrDefault(n.dns_servers, '[]'),
        description: pickStringOrNull(n, 'description'),
        is_favorite: pickBool(n, 'is_favorite'),
        created_at: getCreatedAt(n),
        updated_at: getUpdatedAt(n)
      } })
    }
    counts.networks = networks.length

    // --- IpAllocations (before Ports, so Port.connected_allocation_id can resolve)
    for (const a of allocations) {
      const networkId = typeof a.network_id === 'string' ? networkMap.get(a.network_id) : undefined
      if (!networkId) continue
      await tx.ipAllocation.create({ data: {
        id: allocationMap.get(a.id)!,
        network_id: networkId,
        ip_address: pickString(a, 'ip_address'),
        hostname: pickStringOrNull(a, 'hostname'),
        mac_address: pickStringOrNull(a, 'mac_address'),
        device_type: pickStringOrNull(a, 'device_type'),
        description: pickStringOrNull(a, 'description'),
        status: pickString(a, 'status', 'active'),
        created_at: getCreatedAt(a),
        updated_at: getUpdatedAt(a)
      } })
    }
    counts.allocations = allocations.length

    // --- LagGroups (before Ports, so Port.lag_group_id can resolve)
    for (const lg of lagGroups) {
      const switchId = typeof lg.switch_id === 'string' ? switchMap.get(lg.switch_id) : undefined
      if (!switchId) continue
      await tx.lagGroup.create({ data: {
        id: lagMap.get(lg.id)!,
        switch_id: switchId,
        name: pickString(lg, 'name'),
        remote_device: pickStringOrNull(lg, 'remote_device'),
        remote_device_id: pickStringOrNull(lg, 'remote_device_id'),
        description: pickStringOrNull(lg, 'description'),
        created_at: getCreatedAt(lg),
        updated_at: getUpdatedAt(lg)
      } })
    }
    counts.lagGroups = lagGroups.length

    // --- Ports (embedded in switches)
    let portCount = 0
    for (const sw of switches) {
      const switchId = switchMap.get(sw.id)
      if (!switchId) continue
      const swPorts = sw.ports ?? []
      for (const p of swPorts) {
        const lagId = typeof p.lag_group_id === 'string' ? lagMap.get(p.lag_group_id) ?? null : null
        const allocId = typeof p.connected_allocation_id === 'string'
          ? allocationMap.get(p.connected_allocation_id) ?? null
          : null
        const remoteSwitchId = typeof p.connected_device_id === 'string'
          ? switchMap.get(p.connected_device_id) ?? p.connected_device_id // tolerate stale
          : null
        const remotePortId = typeof p.connected_port_id === 'string'
          ? portMap.get(p.connected_port_id) ?? p.connected_port_id // tolerate stale
          : null
        await tx.port.create({ data: {
          id: portMap.get(p.id)!,
          switch_id: switchId,
          unit: typeof p.unit === 'number' ? p.unit : 1,
          index: typeof p.index === 'number' ? p.index : 0,
          label: pickStringOrNull(p, 'label'),
          type: pickString(p, 'type', 'rj45'),
          speed: pickStringOrNull(p, 'speed'),
          status: pickString(p, 'status', 'down'),
          port_mode: pickStringOrNull(p, 'port_mode'),
          access_vlan: pickNumberOrNull(p, 'access_vlan'),
          native_vlan: pickNumberOrNull(p, 'native_vlan'),
          tagged_vlans: stringifyOrDefault(p.tagged_vlans, '[]'),
          connected_device: pickStringOrNull(p, 'connected_device'),
          connected_device_id: remoteSwitchId,
          connected_port_id: remotePortId,
          connected_port: pickStringOrNull(p, 'connected_port'),
          description: pickStringOrNull(p, 'description'),
          mac_address: pickStringOrNull(p, 'mac_address'),
          lag_group_id: lagId,
          connected_allocation_id: allocId,
          poe: p.poe === null || p.poe === undefined ? null : JSON.stringify(p.poe),
          helper_usage: pickStringOrNull(p, 'helper_usage'),
          helper_label: pickStringOrNull(p, 'helper_label'),
          show_in_helper_list: typeof p.show_in_helper_list === 'boolean'
            ? p.show_in_helper_list
            : null
        } })
        portCount++
      }
    }
    counts.ports = portCount

    // --- IpRanges
    for (const r of ranges) {
      const networkId = typeof r.network_id === 'string' ? networkMap.get(r.network_id) : undefined
      if (!networkId) continue
      await tx.ipRange.create({ data: {
        id: rangeMap.get(r.id)!,
        network_id: networkId,
        start_ip: pickString(r, 'start_ip'),
        end_ip: pickString(r, 'end_ip'),
        type: pickString(r, 'type', 'static'),
        description: pickStringOrNull(r, 'description'),
        created_at: getCreatedAt(r),
        updated_at: getUpdatedAt(r)
      } })
    }
    counts.ranges = ranges.length

    // --- PublicTokens
    for (const t of tokens) {
      const switchId = typeof t.switch_id === 'string' ? switchMap.get(t.switch_id) : undefined
      if (!switchId) continue
      await tx.publicToken.create({ data: {
        id: tokenMap.get(t.id)!,
        switch_id: switchId,
        token: pickString(t, 'token'),
        created_at: getCreatedAt(t),
        revoked_at: pickStringOrNull(t, 'revoked_at'),
        last_access_at: pickStringOrNull(t, 'last_access_at')
      } })
    }
    counts.tokens = tokens.length

    // --- TopologyLayouts (keyed by site_id in legacy JSON)
    let topoCount = 0
    for (const [oldSiteId, layout] of Object.entries(topologyLayouts)) {
      const newSiteId = siteMap.get(oldSiteId)
      if (!newSiteId) continue
      // Remap node IDs inside node_positions (keys are switch IDs).
      const remappedPositions: Record<string, unknown> = {}
      const positions = layout.node_positions ?? {}
      for (const [nodeId, pos] of Object.entries(positions)) {
        const mapped = globalIdMap.get(nodeId) ?? nodeId
        remappedPositions[mapped] = pos
      }
      await tx.topologyLayout.create({ data: {
        site_id: newSiteId,
        node_positions: JSON.stringify(remappedPositions),
        updated_at: layout.updated_at || nowIso()
      } })
      topoCount++
    }
    counts.topologyLayouts = topoCount

    // --- ActivityEntries (deep-remap changes/previous_state/metadata)
    for (const a of activities) {
      const userId = typeof a.user_id === 'string' ? userMap.get(a.user_id) ?? null : null
      const entityId = typeof a.entity_id === 'string'
        ? globalIdMap.get(a.entity_id) ?? a.entity_id
        : ''
      const changes = a.changes !== undefined ? remapJson(a.changes, globalIdMap) : null
      const previousState = a.previous_state !== undefined ? remapJson(a.previous_state, globalIdMap) : null
      const metadata = a.metadata !== undefined ? remapJson(a.metadata, globalIdMap) : null
      await tx.activityEntry.create({ data: {
        id: activityMap.get(a.id)!,
        user_id: userId,
        action: pickString(a, 'action'),
        entity_type: pickString(a, 'entity_type'),
        entity_id: entityId,
        entity_name: pickString(a, 'entity_name'),
        changes: changes === null ? null : JSON.stringify(changes),
        previous_state: previousState === null ? null : JSON.stringify(previousState),
        metadata: metadata === null ? null : JSON.stringify(metadata),
        timestamp: pickString(a, 'timestamp', nowIso())
      } })
    }
    counts.activities = activities.length
  }, { timeout: 120_000, maxWait: 10_000 })

  // 4. Archive JSON files. Atomic per-file rename, all into a timestamped folder.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const archiveDir = join(dataDir, `_archive_${stamp}`)
  await mkdir(archiveDir, { recursive: true })

  const entries = await readdir(dataDir)
  const knownFiles = new Set<string>(JSON_FILES)
  for (const entry of entries) {
    if (!knownFiles.has(entry)) continue
    await rename(join(dataDir, entry), join(archiveDir, entry))
  }

  return { counts, archived: archiveDir }
}
