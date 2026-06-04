import type { Site } from '~~/types/site'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * If the user lands on `/sites/<uuid>/...`, look the site up, and if a slug
 * is available, rewrite the URL to the slug form. Old bookmarks self-heal
 * silently and the address bar shows the canonical slug URL afterwards.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const match = to.path.match(/^\/sites\/([^/]+)(\/.*)?$/)
  if (!match) return
  const segment = match[1]!
  const rest = match[2] ?? ''

  // Skip if it's already a slug, the All Sites pseudo-id, or not a UUID at all.
  if (segment === 'all' || !UUID_RE.test(segment)) return

  try {
    const site = await $fetch<Site | { data?: Site }>(`/api/sites/${segment}`)
    const slug = ('slug' in (site as Site) ? (site as Site).slug : (site as { data?: Site }).data?.slug)
    if (slug && slug !== segment) {
      return navigateTo(
        { path: `/sites/${slug}${rest}`, query: to.query, hash: to.hash },
        { redirectCode: 301 }
      )
    }
  } catch {
    // 404 or auth error → let the normal route handle it.
  }
})
