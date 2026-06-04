import type { PrismaClient } from '@prisma/client'
import { slugify, resolveSlugCollision } from './slugify'

/**
 * Reproduce the SQL placeholder formula from the 20260603223256_slugs
 * migration:
 *   REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(name),
 *     ' ', '-'), '_', '-'), '/', '-'), '.', '-'), '(', ''), ')', '')
 *   || '-' || SUBSTR(id, 1, 6)
 */
function sqlPlaceholderSlug(name: string, id: string): string {
  return name
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/_/g, '-')
    .replace(/\//g, '-')
    .replace(/\./g, '-')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    + '-' + id.slice(0, 6)
}

/**
 * One-shot pass that finds slugs left behind by the 0.22 schema migration
 * (where existing rows got `<lowercase-name>-<6-char-id>` slugs) and replaces
 * them with clean `slugify(name)` values. Idempotent: re-running on a clean DB
 * is a no-op because non-placeholder slugs are left untouched.
 *
 * Runs inside the init plugin so the first start on a freshly-upgraded
 * 0.22.x → 0.23.x image silently cleans up.
 */
export async function cleanupMigrationPlaceholderSlugs(prisma: PrismaClient): Promise<{
  sites: number
  switches: number
  networks: number
}> {
  const stats = { sites: 0, switches: 0, networks: 0 }

  // --- Sites: global unique slug.
  const sites = await prisma.site.findMany()
  const takenSiteSlugs = new Set(sites.map(s => s.slug))
  for (const s of sites) {
    if (s.slug !== sqlPlaceholderSlug(s.name, s.id)) continue
    takenSiteSlugs.delete(s.slug)
    const clean = await resolveSlugCollision(slugify(s.name), async (candidate) => takenSiteSlugs.has(candidate))
    takenSiteSlugs.add(clean)
    await prisma.site.update({ where: { id: s.id }, data: { slug: clean } })
    stats.sites++
  }

  // --- Switches: slug unique per site.
  const switches = await prisma.switch.findMany()
  const switchSlugsBySite = new Map<string, Set<string>>()
  for (const sw of switches) {
    let scope = switchSlugsBySite.get(sw.site_id)
    if (!scope) { scope = new Set(); switchSlugsBySite.set(sw.site_id, scope) }
    scope.add(sw.slug)
  }
  for (const sw of switches) {
    if (sw.slug !== sqlPlaceholderSlug(sw.name, sw.id)) continue
    const scope = switchSlugsBySite.get(sw.site_id)!
    scope.delete(sw.slug)
    const clean = await resolveSlugCollision(slugify(sw.name), async (candidate) => scope.has(candidate))
    scope.add(clean)
    await prisma.switch.update({ where: { id: sw.id }, data: { slug: clean } })
    stats.switches++
  }

  // --- Networks: slug unique per site.
  const networks = await prisma.network.findMany()
  const netSlugsBySite = new Map<string, Set<string>>()
  for (const n of networks) {
    let scope = netSlugsBySite.get(n.site_id)
    if (!scope) { scope = new Set(); netSlugsBySite.set(n.site_id, scope) }
    scope.add(n.slug)
  }
  for (const n of networks) {
    if (n.slug !== sqlPlaceholderSlug(n.name, n.id)) continue
    const scope = netSlugsBySite.get(n.site_id)!
    scope.delete(n.slug)
    const clean = await resolveSlugCollision(slugify(n.name), async (candidate) => scope.has(candidate))
    scope.add(clean)
    await prisma.network.update({ where: { id: n.id }, data: { slug: clean } })
    stats.networks++
  }

  return stats
}
