interface AuthUser {
  id: string
  username: string
  display_name: string
  role: string
  language: string
}

const user = ref<AuthUser | null>(null)
const setupCompleted = ref<boolean | null>(null)

export function useAuth() {
  const isLoggedIn = computed(() => !!user.value)

  async function fetchUser() {
    try {
      const data = await $fetch<AuthUser>('/api/auth/me')
      user.value = data
      return data
    } catch {
      user.value = null
      return null
    }
  }

  async function checkSetup(): Promise<boolean> {
    try {
      const data = await $fetch<{ setup_completed: boolean }>('/api/settings')
      setupCompleted.value = data.setup_completed
      return data.setup_completed
    } catch {
      // If settings endpoint fails (auth required), setup is done
      setupCompleted.value = true
      return true
    }
  }

  async function login(username: string, password: string, rememberMe: boolean = false) {
    const data = await $fetch<{ user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { username, password, remember_me: rememberMe }
    })
    user.value = data.user
    return data
  }

  async function setup(data: { username: string; display_name: string; password: string; language: string }) {
    const result = await $fetch<{ user: AuthUser; token: string }>('/api/auth/setup', {
      method: 'POST',
      body: data
    })
    user.value = result.user
    setupCompleted.value = true
    return result
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return {
    user: readonly(user),
    isLoggedIn,
    setupCompleted: readonly(setupCompleted),
    fetchUser,
    checkSetup,
    login,
    setup,
    logout
  }
}
