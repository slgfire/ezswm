import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'

// Vue is installed only as a transitive dependency of Nuxt (pnpm does not link it for project files),
// so resolve it through the actual Nuxt package entry instead of importing 'vue' directly.
const projectRequire = createRequire(import.meta.url)
const nuxtRequire = createRequire(projectRequire.resolve('nuxt/package.json'))
const { computed, effectScope, ref, toValue, watch: vueWatch } = nuxtRequire('vue')
type EffectScope = { run: <T>(fn: () => T) => T | undefined, stop: () => void }

type Call = { url: string; method: string; body?: { node_positions: Record<string, { x: number; y: number }> }; resolve: (v?: unknown) => void; reject: (e: unknown) => void }

let scope: EffectScope | null = null
const pos = (x: number) => ({ n1: { x, y: 0 } })

async function setup() {
  const calls: Call[] = []
  const canEdit = ref(true)
  const forbidden = vi.fn(async () => 'not-forbidden')
  const toastAdd = vi.fn()
  const apiFetch = vi.fn((url: string, opts?: { method?: string; body?: Call['body'] }) =>
    new Promise((resolve, reject) => {
      calls.push({ url, method: opts?.method ?? 'GET', body: opts?.body, resolve, reject })
    })
  )
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('toValue', toValue)
  vi.stubGlobal('watch', vueWatch)
  vi.stubGlobal('onBeforeUnmount', vi.fn())
  vi.stubGlobal('useApiFetch', () => ({ apiFetch }))
  vi.stubGlobal('useAuth', () => ({ canEditInfrastructure: canEdit, handleInfrastructureForbidden: forbidden }))
  vi.stubGlobal('useToast', () => ({ add: toastAdd }))
  vi.stubGlobal('useI18n', () => ({ t: (k: string) => k }))
  const { useTopology } = await import('../app/composables/useTopology')
  const siteId = ref('site-1')
  scope = effectScope()
  const topo = scope.run(() => useTopology(siteId))!
  return { topo, calls, canEdit, toastAdd }
}

const methods = (calls: Call[]) => calls.map(c => c.method)
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

describe('useTopology autosave/reset', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(async () => {
    await flush()
    scope?.stop()
    scope = null
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('debounces drags and saves only the latest positions', async () => {
    const { topo, calls } = await setup()
    topo.saveLayout(pos(1))
    topo.saveLayout(pos(2))
    await vi.advanceTimersByTimeAsync(250)
    expect(methods(calls)).toEqual(['PUT'])
    expect(calls[0]!.url).toBe('/api/sites/site-1/topology-layout')
    expect(calls[0]!.body).toEqual({ node_positions: pos(2) })
    calls[0]!.resolve()
  })

  it('reset cancels a queued save', async () => {
    const { topo, calls } = await setup()
    topo.saveLayout(pos(1))
    const reset = topo.resetLayout()
    await flush()
    await vi.advanceTimersByTimeAsync(500)
    expect(methods(calls)).toEqual(['DELETE'])
    calls[0]!.resolve()
    expect(await reset).toBe(true)
  })

  it('late drag during held PUT does not queue or DELETE before PUT settles', async () => {
    const { topo, calls } = await setup()
    topo.saveLayout(pos(1))
    await vi.advanceTimersByTimeAsync(250)
    expect(methods(calls)).toEqual(['PUT'])
    const reset = topo.resetLayout()
    topo.saveLayout(pos(2))
    await vi.advanceTimersByTimeAsync(500)
    expect(methods(calls)).toEqual(['PUT'])
    calls[0]!.resolve()
    await flush()
    expect(methods(calls)).toEqual(['PUT', 'DELETE'])
    expect(calls[1]!.url).toBe('/api/sites/site-1/topology-layout')
    calls[1]!.resolve()
    expect(await reset).toBe(true)
    await vi.advanceTimersByTimeAsync(500)
    expect(methods(calls)).toEqual(['PUT', 'DELETE'])
  })

  it('late drag during held DELETE is blocked; saving resumes afterwards', async () => {
    const { topo, calls } = await setup()
    const reset = topo.resetLayout()
    await flush()
    topo.saveLayout(pos(2))
    await vi.advanceTimersByTimeAsync(500)
    expect(methods(calls)).toEqual(['DELETE'])
    calls[0]!.resolve()
    await reset
    topo.saveLayout(pos(3))
    await vi.advanceTimersByTimeAsync(250)
    expect(methods(calls)).toEqual(['DELETE', 'PUT'])
    expect(calls[1]!.url).toBe('/api/sites/site-1/topology-layout')
    expect(calls[1]!.body).toEqual({ node_positions: pos(3) })
    calls[1]!.resolve()
  })

  it('concurrent resets issue one DELETE and failure releases the guard', async () => {
    const { topo, calls, toastAdd } = await setup()
    const first = topo.resetLayout()
    const second = topo.resetLayout()
    expect(await second).toBe(false)
    await flush()
    expect(methods(calls)).toEqual(['DELETE'])
    calls[0]!.reject({ statusMessage: 'boom' })
    expect(await first).toBe(false)
    expect(toastAdd).toHaveBeenCalled()
    topo.saveLayout(pos(1))
    await vi.advanceTimersByTimeAsync(250)
    expect(methods(calls)).toEqual(['DELETE', 'PUT'])
    calls[1]!.resolve()
  })

  it('permission loss cancels queued save with no writes', async () => {
    const { topo, calls, canEdit } = await setup()
    topo.saveLayout(pos(1))
    canEdit.value = false
    await flush()
    await vi.advanceTimersByTimeAsync(500)
    topo.saveLayout(pos(2))
    expect(await topo.resetLayout()).toBe(false)
    await vi.advanceTimersByTimeAsync(500)
    expect(calls).toEqual([])
  })
})
