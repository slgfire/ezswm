import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'

// Vue is installed only as a transitive dependency of Nuxt, so resolve it through the Nuxt package entry.
const projectRequire = createRequire(import.meta.url)
const nuxtRequire = createRequire(projectRequire.resolve('nuxt/package.json'))
const { computed, readonly, ref } = nuxtRequire('vue')

type Call = { url: string; resolve: (v?: unknown) => void; reject: (e: unknown) => void }
type TestUser = { id: string; role: string }
const admin: TestUser = { id: 'u-admin', role: 'admin' }
const viewer: TestUser = { id: 'u-admin', role: 'viewer' }
const forbidden = { statusCode: 403 }

async function setup(initial: TestUser | null = admin) {
  const calls: Call[] = []
  const states = new Map<string, { value: unknown }>()
  const nuxtApp = {}
  const $fetch = vi.fn((url: string) => new Promise((resolve, reject) => { calls.push({ url, resolve, reject }) }))
  vi.stubGlobal('$fetch', $fetch)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('readonly', readonly)
  vi.stubGlobal('useNuxtApp', () => nuxtApp)
  vi.stubGlobal('useRequestHeaders', () => ({}))
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(init()))
    return states.get(key)!
  })
  const { useAuth } = await import('../app/composables/useAuth')
  const auth = useAuth()
  states.get('auth-user')!.value = initial
  states.get('auth-resolved')!.value = true
  const me = () => calls.filter(c => c.url === '/api/auth/me')
  const call = (url: string) => calls.filter(c => c.url === url)
  return { auth, calls, me, call, states, userRole: () => (states.get('auth-user')!.value as TestUser | null)?.role ?? null }
}

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }

describe('useAuth forced 403 role refresh', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('a 403 starts a fresh auth/me request instead of joining an older in-flight refresh; the stale Admin reply cannot resurrect', async () => {
    const { auth, me, states, userRole } = await setup()
    const normal = auth.fetchUser()
    expect(me()).toHaveLength(1)
    const handled = auth.handleInfrastructureForbidden(forbidden)
    await flush()
    // The forced request must start before the older (possibly pre-demotion) request settles.
    expect(me()).toHaveLength(2)
    me()[1]!.resolve(viewer)
    expect(await handled).toBe('demoted')
    expect(userRole()).toBe('viewer')
    me()[0]!.resolve(admin)
    await normal
    await flush()
    expect(userRole()).toBe('viewer')
    expect(states.get('auth-refreshing')!.value).toBe(false)
  })

  it('two concurrent 403s coalesce on one fresh request (one demoted, one already-handled) and a normal fetch joins it', async () => {
    const { auth, me, userRole } = await setup()
    const h1 = auth.handleInfrastructureForbidden(forbidden)
    const h2 = auth.handleInfrastructureForbidden(forbidden)
    const normal = auth.fetchUser()
    await flush()
    expect(me()).toHaveLength(1)
    me()[0]!.resolve(viewer)
    const results = [await h1, await h2].sort()
    expect(results).toEqual(['already-handled', 'demoted'])
    expect((await normal)?.role).toBe('viewer')
    expect(me()).toHaveLength(1)
    expect(userRole()).toBe('viewer')
  })

  it('a forced refresh that completes after logout is ignored (no demotion notice) and an old GET cannot clear a newly logged-in user', async () => {
    const { auth, me, call, userRole } = await setup()
    const handled = auth.handleInfrastructureForbidden(forbidden)
    await flush()
    const loggingOut = auth.logout()
    await flush()
    call('/api/auth/logout')[0]!.resolve()
    await loggingOut
    expect(userRole()).toBeNull()
    me()[0]!.resolve(admin)
    expect(await handled).toBe('already-handled')
    expect(userRole()).toBeNull()

    // An older refresh started before a login must not clear the user that logged in afterwards.
    const old = auth.fetchUser()
    await flush()
    const loggingIn = auth.login('u', 'p')
    await flush()
    call('/api/auth/login')[0]!.resolve({ user: admin, token: 't' })
    await loggingIn
    expect(userRole()).toBe('admin')
    me()[me().length - 1]!.reject({ statusCode: 401 })
    await old
    await flush()
    expect(userRole()).toBe('admin')
  })

  it('a stale forced batch cannot clear, notify or resolve a newer forced batch after a session transition', async () => {
    const { auth, me, call, userRole } = await setup()
    const hA = auth.handleInfrastructureForbidden(forbidden)
    await flush()
    expect(me()).toHaveLength(1)
    const loggingIn = auth.login('u', 'p')
    await flush()
    call('/api/auth/login')[0]!.resolve({ user: admin, token: 't' })
    await loggingIn
    expect(userRole()).toBe('admin')

    const hB = auth.handleInfrastructureForbidden(forbidden)
    await flush()
    expect(me()).toHaveLength(2)

    me()[0]!.resolve(viewer) // stale batch A
    expect(await hA).toBe('already-handled')
    expect(userRole()).toBe('admin') // the stale reply is ignored

    // Joining after A's cleanup proves that the old completion did not clear batch B.
    const hC = auth.handleInfrastructureForbidden(forbidden)
    await flush()
    expect(me()).toHaveLength(2) // joins batch B, no third request

    me()[1]!.resolve(viewer)
    const results = [await hB, await hC].sort()
    expect(results).toEqual(['already-handled', 'demoted'])
    expect(userRole()).toBe('viewer')
  })

  it('normal refresh is single-flight and keeps state on 5xx without retry; a forced 5xx keeps Admin without a notice; a definitive 401 clears the user', async () => {
    const { auth, me, userRole } = await setup()
    const p1 = auth.fetchUser()
    const p2 = auth.fetchUser()
    expect(me()).toHaveLength(1)
    me()[0]!.reject({ statusCode: 500 })
    expect((await p1)?.role).toBe('admin')
    expect((await p2)?.role).toBe('admin')
    expect(me()).toHaveLength(1)

    const handled = auth.handleInfrastructureForbidden(forbidden)
    await flush()
    expect(me()).toHaveLength(2)
    me()[1]!.reject({ statusCode: 503 })
    expect(await handled).toBe('unchanged')
    expect(userRole()).toBe('admin')

    const last = auth.fetchUser()
    await flush()
    me()[me().length - 1]!.reject({ statusCode: 401 })
    await last
    expect(userRole()).toBeNull()
  })

  it('a non-role 403 stays unchanged, a known read-only state and non-403 errors make no extra requests', async () => {
    const a = await setup()
    const unchanged = a.auth.handleInfrastructureForbidden(forbidden)
    await flush()
    expect(a.me()).toHaveLength(1)
    a.me()[0]!.resolve(admin)
    expect(await unchanged).toBe('unchanged')
    expect(a.userRole()).toBe('admin')

    const b = await setup(viewer)
    expect(await b.auth.handleInfrastructureForbidden(forbidden)).toBe('already-handled')
    expect(b.me()).toHaveLength(0)

    const c = await setup()
    expect(await c.auth.handleInfrastructureForbidden({ statusCode: 500 })).toBe('not-forbidden')
    expect(await c.auth.handleInfrastructureForbidden(new Error('x'))).toBe('not-forbidden')
    expect(c.me()).toHaveLength(0)
  })
})
