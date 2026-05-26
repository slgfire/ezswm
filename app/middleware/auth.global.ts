export default defineNuxtRouteMiddleware(async (to) => {
  // Public routes — no auth required
  if (to.path.startsWith('/p/')) return

  const { user, fetchUser, checkSetup, setupCompleted, sitesInitialized } = useAuth()

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

  // Try to fetch the current user if not loaded
  if (!user.value) {
    await fetchUser()
  }

  // Apply user's language preference
  if (user.value?.language) {
    try {
      const { setLocale } = useI18n()
      await setLocale(user.value.language as 'en' | 'de')
    } catch {
      // useI18n may not be available during SSR
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
