interface AuthUser {
  id: string
  username: string
  display_name: string
  role: string
  language: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const setupCompleted = useState<boolean | null>('auth-setup', () => null)
  const isLoggedIn = computed(() => !!user.value)

  function getRequestOpts(): { headers: Record<string, string> } {
    if (import.meta.server) {
      const headers = useRequestHeaders(['cookie'])
      if (headers.cookie) {
        return { headers: { cookie: headers.cookie } }
      }
    }
    return { headers: {} }
  }

  async function fetchUser() {
    try {
      const data = await $fetch<AuthUser>('/api/auth/me', getRequestOpts())
      user.value = data
      return data
    } catch {
      user.value = null
      return null
    }
  }

  async function checkSetup(): Promise<boolean> {
    try {
      const data = await $fetch<{ setup_completed: boolean }>('/api/settings', getRequestOpts())
      setupCompleted.value = data.setup_completed
      return data.setup_completed
    } catch {
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
