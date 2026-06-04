import type { Site } from '~~/types/site'
import type { Switch } from '~~/types/switch'
import type { Network } from '~~/types/network'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface Wrapped<T> { data?: T }
function unwrap<T extends { slug?: string }>(payload: T | Wrapped<T>): T | undefined {
  if (payload && typeof payload === 'object' && 'slug' in payload) return payload as T
  const w = payload as Wrapped<T>
  return w?.data
}

/**
 * Translate UUID-shaped URL segments to their slug form so old bookmarks
 * self-heal. Handles three patterns:
 *
 *   /sites/<uuid>                                  → /sites/<slug>
 *   /sites/<site-seg>/switches/<switch-uuid>/...   → /sites/<site-seg>/switches/<switch-slug>/...
 *   /sites/<site-seg>/subnets/<network-uuid>/...   → /sites/<site-seg>/subnets/<network-slug>/...
 *
 * The site segment is fixed up first; if there's a switch / subnet UUID after
 * it, that's handled in a second pass so the final URL has both segments in
 * canonical form.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const match = to.path.match(/^\/sites\/([^/]+)(?:\/(switches|subnets)\/([^/]+))?(\/.*)?$/)
  if (!match) return
  const siteSeg = match[1]!
  const kind = match[2] // 'switches' | 'subnets' | undefined
  const entitySeg = match[3]
  const tail = match[4] ?? ''

  let finalSiteSeg = siteSeg
  let finalEntitySeg = entitySeg

  // --- Site segment.
  if (siteSeg !== 'all' && UUID_RE.test(siteSeg)) {
    try {
      const site = unwrap<Site>(await $fetch<Site | Wrapped<Site>>(`/api/sites/${siteSeg}`))
      if (site?.slug && site.slug !== siteSeg) {
        finalSiteSeg = site.slug
      }
    } catch {
      // 404 / auth → let the route handle it.
    }
  }

  // --- Nested switch / subnet segment.
  if (kind && entitySeg && UUID_RE.test(entitySeg)) {
    const apiBase = kind === 'switches' ? '/api/switches' : '/api/networks'
    try {
      const entity = unwrap<Switch | Network>(await $fetch<Switch | Network | Wrapped<Switch | Network>>(`${apiBase}/${entitySeg}`))
      if (entity?.slug && entity.slug !== entitySeg) {
        finalEntitySeg = entity.slug
      }
    } catch {
      // 404 / auth → fall through.
    }
  }

  if (finalSiteSeg === siteSeg && finalEntitySeg === entitySeg) return

  const segments = kind
    ? `/sites/${finalSiteSeg}/${kind}/${finalEntitySeg ?? entitySeg}${tail}`
    : `/sites/${finalSiteSeg}${tail}`

  return navigateTo(
    { path: segments, query: to.query, hash: to.hash },
    { redirectCode: 301 }
  )
})
