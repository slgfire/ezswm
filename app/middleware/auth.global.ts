import { isPublicAuthPath } from '../utils/permissions'

export default defineNuxtRouteMiddleware(async (to) => {
  // Public routes — no auth required
  if (to.path.startsWith('/p/')) return

  const nuxtApp = useNuxtApp()
  const { user, authResolved, fetchUser, checkSetup, setupCompleted, sitesInitialized } = useAuth()

  // Fetch setup status on first load
  if (setupCompleted.value === null || sitesInitialized.value === null) {
    await checkSetup()
  }

  // Step 1 — initial admin user not yet created
  if (!setupCompleted.value) {
    if (to.path === '/setup') return
    return navigateTo('/setup')
  }

  // Login page handling (user exists but possibly not logged in)
  if (to.path === '/login') {
    if (user.value) return navigateTo('/')
    return
  }

  // Resolve the current user. First resolution waits; afterwards at most one
  // single-flight background refresh per protected client navigation keeps
  // the role fresh without blocking and without clearing the last user on
  // transient errors.
  if (!user.value || !authResolved.value) {
    await fetchUser()
  } else if (import.meta.client && !nuxtApp.isHydrating && !isPublicAuthPath(to.path)) {
    void fetchUser().then((u) => {
      if (!u) void navigateTo('/login')
    })
  }

  // Apply user's language preference. useI18n() is component-setup-only and
  // throws after the awaits above, so use the global composer captured via
  // nuxtApp (valid across awaits; wrapped in the Nuxt context).
  const language = user.value?.language
  if ((language === 'en' || language === 'de') && nuxtApp.$i18n.locale.value !== language) {
    try {
      await nuxtApp.runWithContext(() => nuxtApp.$i18n.setLocale(language))
    } catch (error) {
      console.warn('[auth] Could not apply the stored language preference', error)
    }
  }

  // Not logged in — go to login
  if (!user.value) {
    return navigateTo('/login')
  }

  // Step 2 — admin user exists and is logged in, but no initial site has
  // been created yet (fresh install just past step 1, or legacy install
  // being migrated). Funnel through /setup so the operator names the site.
  if (!sitesInitialized.value) {
    if (to.path === '/setup') return
    return navigateTo('/setup')
  }

  // Setup fully done — bounce away from /setup.
  if (to.path === '/setup') {
    return navigateTo('/')
  }
})
