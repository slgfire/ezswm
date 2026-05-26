interface AuthUser {
  id: string
  username: string
  display_name: string
  role: string
  language: string
}

interface SetupStatus {
  setup_completed: boolean
  sites_initialized: boolean
  orphans: { switches: number; vlans: number; networks: number }
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const setupCompleted = useState<boolean | null>('auth-setup', () => null)
  const sitesInitialized = useState<boolean | null>('sites-initialized', () => null)
  const setupOrphans = useState<SetupStatus['orphans'] | null>('setup-orphans', () => null)
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

  async function checkSetup(): Promise<SetupStatus> {
    try {
      const data = await $fetch<SetupStatus>('/api/setup/status', getRequestOpts())
      setupCompleted.value = data.setup_completed
      sitesInitialized.value = data.sites_initialized
      setupOrphans.value = data.orphans
      return data
    } catch {
      // Fail open so a broken status endpoint doesn't lock everyone out.
      setupCompleted.value = true
      sitesInitialized.value = true
      setupOrphans.value = { switches: 0, vlans: 0, networks: 0 }
      return { setup_completed: true, sites_initialized: true, orphans: { switches: 0, vlans: 0, networks: 0 } }
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

  async function createInitialSite(data: { name: string; description?: string }) {
    const result = await $fetch<{ site: { id: string; name: string }; migrated: { switches: number; vlans: number; networks: number } }>('/api/setup/initial-site', {
      method: 'POST',
      body: data
    })
    sitesInitialized.value = true
    setupOrphans.value = { switches: 0, vlans: 0, networks: 0 }
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
    sitesInitialized: readonly(sitesInitialized),
    setupOrphans: readonly(setupOrphans),
    fetchUser,
    checkSetup,
    login,
    setup,
    createInitialSite,
    logout
  }
}
