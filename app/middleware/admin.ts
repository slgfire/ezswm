export default defineNuxtRouteMiddleware(async () => {
  const { isAdmin, authResolved, fetchUser } = useAuth()

  // Wait for initial resolution; never treat "still loading" as non-admin.
  if (!authResolved.value) await fetchUser()

  if (!isAdmin.value) {
    return navigateTo('/')
  }
})
