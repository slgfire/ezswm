import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

import { isIPInSubnet, isValidIPv4 } from './ipv4'

// ---------------------------------------------------------------------------
// Legacy JSON shapes — kept loose because data is user-owned.
// ---------------------------------------------------------------------------

interface LegacyAlloc {
  id?: string
  network_id?: string
  ip_address?: string
  hostname?: string
  mac_address?: string
  device_type?: string
  description?: string
  status?: string
  created_at?: string
  updated_at?: string
}

interface LegacyNetwork {
  id?: string
  site_id?: string
  name?: string
  subnet?: string
}

interface LegacySite {
  id?: string
  name?: string
}

export interface RecoveryReport {
  archiveDir: string | null
  archivedAllocations: number
  alreadyInDb: number
  recovered: number
  skippedOrphan: number      // archived alloc whose archived network can't be located
  skippedAmbiguous: number   // matched multiple DB networks, couldn't disambiguate
  skippedNoSubnetMatch: number
  skippedInvalidIp: number
  details: Array<{
    ip: string
    archivedNetworkName?: string
    archivedSiteName?: string
    decision: 'inserted' | 'already-in-db' | 'orphan' | 'ambiguous' | 'no-subnet-match' | 'invalid-ip' | 'dry-run-would-insert'
    matchedNetworkId?: string
    reason?: string
  }>
}

async function readJsonFile<T>(dir: string, name: string, fallback: T): Promise<T> {
  const path = join(dir, name)
  if (!existsSync(path)) return fallback
  const buf = await readFile(path, 'utf-8')
  if (!buf.trim()) return fallback
  return JSON.parse(buf) as T
}

/**
 * Locate the most recent `_archive_<ISO>/` directory created by the JSON→SQLite
 * migration. Returns `null` if no archive folders exist.
 */
async function findLatestArchive(dataDir: string): Promise<string | null> {
  if (!existsSync(dataDir)) return null
  const entries = await readdir(dataDir, { withFileTypes: true })
  const archives = entries
    .filter(e => e.isDirectory() && e.name.startsWith('_archive_'))
    .map(e => e.name)
    .sort() // ISO timestamps sort lexicographically
  if (archives.length === 0) return null
  return join(dataDir, archives[archives.length - 1]!)
}

/**
 * Recover IP allocations that didn't make it through the JSON→SQLite migration.
 *
 * Strategy: for every allocation in the archived ip-allocations.json, look at
 * its IP. Find DB networks whose subnet contains that IP. If exactly one
 * matches, the allocation belongs there. If multiple match (e.g. two sites
 * with overlapping subnets), disambiguate by joining through the archived
 * network → site, then matching the site by name in the current DB.
 *
 * The function is idempotent — allocations that already exist (matched by
 * network + ip) are reported as `already-in-db` and skipped.
 *
 * Defaults to dry-run; pass `apply: true` to write.
 */
export async function recoverArchivedAllocations(opts: {
  prisma: PrismaClient
  dataDir: string
  apply?: boolean
}): Promise<RecoveryReport> {
  const { prisma, dataDir, apply = false } = opts

  const archiveDir = await findLatestArchive(dataDir)
  const report: RecoveryReport = {
    archiveDir,
    archivedAllocations: 0,
    alreadyInDb: 0,
    recovered: 0,
    skippedOrphan: 0,
    skippedAmbiguous: 0,
    skippedNoSubnetMatch: 0,
    skippedInvalidIp: 0,
    details: []
  }
  if (!archiveDir) return report

  const archivedAllocs = await readJsonFile<LegacyAlloc[]>(archiveDir, 'ip-allocations.json', [])
  const archivedNetworks = await readJsonFile<LegacyNetwork[]>(archiveDir, 'networks.json', [])
  const archivedSites = await readJsonFile<LegacySite[]>(archiveDir, 'sites.json', [])

  report.archivedAllocations = archivedAllocs.length
  if (archivedAllocs.length === 0) return report

  const archivedNetworkById = new Map<string, LegacyNetwork>()
  for (const n of archivedNetworks) {
    if (typeof n.id === 'string') archivedNetworkById.set(n.id, n)
  }
  const archivedSiteById = new Map<string, LegacySite>()
  for (const s of archivedSites) {
    if (typeof s.id === 'string') archivedSiteById.set(s.id, s)
  }

  const currentNetworks = await prisma.network.findMany({
    select: { id: true, site_id: true, subnet: true, name: true }
  })
  const currentSitesById = new Map(
    (await prisma.site.findMany({ select: { id: true, name: true } })).map(s => [s.id, s])
  )

  for (const a of archivedAllocs) {
    const ip = typeof a.ip_address === 'string' ? a.ip_address : ''
    const archivedNet = typeof a.network_id === 'string' ? archivedNetworkById.get(a.network_id) : undefined
    const archivedSite = archivedNet && typeof archivedNet.site_id === 'string'
      ? archivedSiteById.get(archivedNet.site_id)
      : undefined

    if (!isValidIPv4(ip)) {
      report.skippedInvalidIp++
      report.details.push({
        ip,
        archivedNetworkName: archivedNet?.name,
        archivedSiteName: archivedSite?.name,
        decision: 'invalid-ip'
      })
      continue
    }

    // 1. Find candidate networks in the current DB whose subnet contains the IP.
    let candidates = currentNetworks.filter(n => {
      try { return isIPInSubnet(ip, n.subnet) } catch { return false }
    })

    if (candidates.length === 0) {
      report.skippedNoSubnetMatch++
      report.details.push({
        ip,
        archivedNetworkName: archivedNet?.name,
        archivedSiteName: archivedSite?.name,
        decision: 'no-subnet-match'
      })
      continue
    }

    // 2. If multiple candidates, try to disambiguate via site name + network name.
    if (candidates.length > 1 && archivedSite?.name) {
      const matchingSiteIds = new Set(
        [...currentSitesById.values()]
          .filter(s => s.name === archivedSite.name)
          .map(s => s.id)
      )
      if (matchingSiteIds.size > 0) {
        const narrowed = candidates.filter(n => matchingSiteIds.has(n.site_id))
        if (narrowed.length > 0) candidates = narrowed
      }
    }
    if (candidates.length > 1 && archivedNet?.name) {
      const narrowed = candidates.filter(n => n.name === archivedNet.name)
      if (narrowed.length > 0) candidates = narrowed
    }

    if (candidates.length > 1) {
      report.skippedAmbiguous++
      report.details.push({
        ip,
        archivedNetworkName: archivedNet?.name,
        archivedSiteName: archivedSite?.name,
        decision: 'ambiguous',
        reason: `${candidates.length} subnet matches: ${candidates.map(c => c.name).join(', ')}`
      })
      continue
    }

    if (!archivedNet && candidates.length === 1) {
      // No archived network to disambiguate but exactly one subnet match — accept it.
    }

    const target = candidates[0]!

    // 3. Already in DB? (match by network + ip)
    const existing = await prisma.ipAllocation.findFirst({
      where: { network_id: target.id, ip_address: ip },
      select: { id: true }
    })
    if (existing) {
      report.alreadyInDb++
      report.details.push({
        ip,
        archivedNetworkName: archivedNet?.name,
        archivedSiteName: archivedSite?.name,
        decision: 'already-in-db',
        matchedNetworkId: target.id
      })
      continue
    }

    if (!apply) {
      report.recovered++ // would-recover under dry-run
      report.details.push({
        ip,
        archivedNetworkName: archivedNet?.name,
        archivedSiteName: archivedSite?.name,
        decision: 'dry-run-would-insert',
        matchedNetworkId: target.id
      })
      continue
    }

    const now = new Date().toISOString()
    try {
      await prisma.ipAllocation.create({
        data: {
          id: randomUUID(),
          network_id: target.id,
          ip_address: ip,
          hostname: a.hostname ?? null,
          mac_address: a.mac_address ?? null,
          device_type: a.device_type ?? null,
          description: a.description ?? null,
          status: a.status ?? 'active',
          created_at: a.created_at ?? now,
          updated_at: now
        }
      })
      report.recovered++
      report.details.push({
        ip,
        archivedNetworkName: archivedNet?.name,
        archivedSiteName: archivedSite?.name,
        decision: 'inserted',
        matchedNetworkId: target.id
      })
    } catch (err) {
      report.skippedOrphan++
      report.details.push({
        ip,
        archivedNetworkName: archivedNet?.name,
        archivedSiteName: archivedSite?.name,
        decision: 'orphan',
        matchedNetworkId: target.id,
        reason: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return report
}
