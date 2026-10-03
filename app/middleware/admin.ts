export default defineNuxtRouteMiddleware(() => {
  const { user } = useAuth()

  if (user.value?.role !== 'admin') {
    return navigateTo('/')
  }
})
