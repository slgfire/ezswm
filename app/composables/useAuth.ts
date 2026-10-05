import type { SafeUser } from '../../types/user'
import {
  canEditInfrastructureForRole,
  deriveRoleState,
  getErrorStatus,
  isDefinitiveAuthFailure
} from '../utils/permissions'

type AuthUser = SafeUser

interface SetupStatus {
  setup_completed: boolean
  sites_initialized: boolean
  orphans: { switches: number; vlans: number; networks: number }
}

export type InfrastructureForbiddenResult = 'not-forbidden' | 'demoted' | 'already-handled' | 'unchanged'

interface AuthRuntime {
  refresh: Promise<AuthUser | null> | null
  demotionNotified: boolean
  // bumped on every explicit auth transition; stale refreshes must not write
  generation: number
}

// Per-request/app runtime (never module-level: SSR shares modules across requests).
const runtimes = new WeakMap<object, AuthRuntime>()

export function useAuth() {
  const nuxtApp = useNuxtApp()
  let runtime = runtimes.get(nuxtApp)
  if (!runtime) {
    runtime = { refresh: null, demotionNotified: false, generation: 0 }
    runtimes.set(nuxtApp, runtime)
  }
  const rt = runtime

  const user = useState<AuthUser | null>('auth-user', () => null)
  const setupCompleted = useState<boolean | null>('auth-setup', () => null)
  const sitesInitialized = useState<boolean | null>('sites-initialized', () => null)
  const setupOrphans = useState<SetupStatus['orphans'] | null>('setup-orphans', () => null)
  // false until the first auth/me resolution finished (success or definitive failure)
  const authResolved = useState<boolean>('auth-resolved', () => false)
  // true while a refresh is in flight after the initial resolution (background)
  const authRefreshing = useState<boolean>('auth-refreshing', () => false)
  const isLoggedIn = computed(() => !!user.value)
  const roleState = computed(() => deriveRoleState(authResolved.value, user.value))
  const isAuthLoading = computed(() => !authResolved.value)
  const isAdmin = computed(() => roleState.value === 'admin')
  const isViewer = computed(() => roleState.value === 'viewer')
  const canEditInfrastructure = computed(() => canEditInfrastructureForRole(user.value?.role) && authResolved.value)

  function getRequestOpts(): { headers: Record<string, string> } {
    if (import.meta.server) {
      const headers = useRequestHeaders(['cookie'])
      if (headers.cookie) {
        return { headers: { cookie: headers.cookie } }
      }
    }
    return { headers: {} }
  }

  /**
   * Single-flight auth/me refresh. 401/404 clears the user; network/5xx errors
   * keep the last resolved user and role.
   */
  // Drop any in-flight refresh: its result will be ignored (generation check).
  function invalidateRefresh() {
    rt.generation++
    rt.refresh = null
    authRefreshing.value = false
  }

  function fetchUser(): Promise<AuthUser | null> {
    if (rt.refresh) return rt.refresh
    const gen = rt.generation
    const isCurrent = () => rt.generation === gen
    const background = authResolved.value
    if (background) authRefreshing.value = true
    const promise: Promise<AuthUser | null> = (async () => {
      try {
        const data = await $fetch<AuthUser>('/api/auth/me', getRequestOpts())
        if (!isCurrent()) return user.value
        user.value = data
        if (data?.role === 'admin') rt.demotionNotified = false
        return data
      } catch (error) {
        if (isCurrent() && isDefinitiveAuthFailure(error)) user.value = null
        return user.value
      } finally {
        if (isCurrent()) {
          authResolved.value = true
          authRefreshing.value = false
          rt.refresh = null
        }
      }
    })()
    // Only publish as the in-flight refresh if nothing invalidated us synchronously.
    if (isCurrent()) rt.refresh = promise
    return promise
  }

  /**
   * Call from an individual infrastructure mutation's catch block. On a 403 it
   * refreshes the role once (single-flight, no retry of the mutation) and
   * reports whether the UI should go read-only:
   *  - 'demoted': role no longer allows editing; first caller only -> show ONE
   *    notice, cancel queued autosaves, close editors.
   *  - 'already-handled': readonly already known / notice already issued.
   *  - 'unchanged': still admin (403 not role related) -> use normal error UI.
   *  - 'not-forbidden': error is not a 403.
   */
  async function handleInfrastructureForbidden(error: unknown): Promise<InfrastructureForbiddenResult> {
    if (getErrorStatus(error) !== 403) return 'not-forbidden'
    if (authResolved.value && !canEditInfrastructure.value) return 'already-handled'
    await fetchUser()
    if (canEditInfrastructure.value) return 'unchanged'
    if (rt.demotionNotified) return 'already-handled'
    rt.demotionNotified = true
    return 'demoted'
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
    invalidateRefresh()
    const data = await $fetch<{ user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { username, password, remember_me: rememberMe }
    })
    invalidateRefresh()
    user.value = data.user
    authResolved.value = true
    rt.demotionNotified = false
    return data
  }

  async function setup(data: { username: string; display_name: string; password: string; language: string }) {
    invalidateRefresh()
    const result = await $fetch<{ user: AuthUser; token: string }>('/api/auth/setup', {
      method: 'POST',
      body: data
    })
    invalidateRefresh()
    user.value = result.user
    authResolved.value = true
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
    invalidateRefresh()
    await $fetch('/api/auth/logout', { method: 'POST' })
    invalidateRefresh()
    user.value = null
    authResolved.value = true
  }

  return {
    user: readonly(user),
    isLoggedIn,
    authResolved: readonly(authResolved),
    authRefreshing: readonly(authRefreshing),
    isAuthLoading,
    roleState,
    isAdmin,
    isViewer,
    canEditInfrastructure,
    setupCompleted: readonly(setupCompleted),
    sitesInitialized: readonly(sitesInitialized),
    setupOrphans: readonly(setupOrphans),
    fetchUser,
    handleInfrastructureForbidden,
    checkSetup,
    login,
    setup,
    createInitialSite,
    logout
  }
}
