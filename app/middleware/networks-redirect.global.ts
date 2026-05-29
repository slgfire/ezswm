// Networks were renamed to Subnets; redirect old /sites/:id/networks URLs.
export default defineNuxtRouteMiddleware((to) => {
  const match = to.path.match(/^\/sites\/([^/]+)\/networks(\/.*)?$/)
  if (!match) return
  return navigateTo(
    { path: `/sites/${match[1]}/subnets${match[2] ?? ''}`, query: to.query, hash: to.hash },
    { redirectCode: 301 }
  )
})
