export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser, checkSetup, setupCompleted } = useAuth()

  // Check setup status on first load
  if (setupCompleted.value === null) {
    await checkSetup()
  }

  // Redirect to setup if not completed
  if (!setupCompleted.value && to.path !== '/setup') {
    return navigateTo('/setup')
  }

  // Don't redirect away from setup if already there and not completed
  if (!setupCompleted.value && to.path === '/setup') {
    return
  }

  // If setup is completed but on setup page, redirect to dashboard
  if (setupCompleted.value && to.path === '/setup') {
    return navigateTo('/')
  }

  // Allow login page
  if (to.path === '/login') {
    if (user.value) {
      return navigateTo('/')
    }
    return
  }

  // Try to fetch user if not loaded
  if (!user.value) {
    await fetchUser()
  }

  // Apply user's language preference
  if (user.value?.language) {
    try {
      const { setLocale } = useI18n()
      await setLocale(user.value.language)
    } catch {
      // useI18n may not be available during SSR
    }
  }

  // Redirect to login if not authenticated
  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
