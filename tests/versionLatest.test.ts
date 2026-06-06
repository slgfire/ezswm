import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

// h3 is a Nuxt/Nitro runtime package not available in the test environment.
// Mock it so that defineEventHandler is a plain pass-through, matching what
// the global stub in vitest.setup.ts does for other server files.
vi.mock('h3', () => ({
  defineEventHandler: (handler: (...args: unknown[]) => unknown) => handler
}))

describe('version-latest endpoint logic', () => {
  beforeEach(() => {
    // Reset modules so each test gets a fresh copy of the module-level cache
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the latest version from GitHub', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v0.24.0' })
    }))

    const { default: handler } = await import('../server/api/version-latest.get')
    const result = await (handler as (event: unknown) => Promise<unknown>)({})
    expect(result).toEqual({ latest: '0.24.0' })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://api.github.com/repos/slgfire/ezswm/releases/latest',
      expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': 'ezSWM' }) })
    )
  })

  it('returns { latest: null } on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const { default: handler } = await import('../server/api/version-latest.get')
    const result = await (handler as (event: unknown) => Promise<unknown>)({})
    expect(result).toEqual({ latest: null })
  })

  it('returns { latest: null } on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { default: handler } = await import('../server/api/version-latest.get')
    const result = await (handler as (event: unknown) => Promise<unknown>)({})
    expect(result).toEqual({ latest: null })
  })

  it('returns cached value within TTL without re-fetching', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v0.25.0' })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { default: handler } = await import('../server/api/version-latest.get')
    // First call — populates the cache
    await (handler as (event: unknown) => Promise<unknown>)({})
    // Second call — should hit cache
    const result = await (handler as (event: unknown) => Promise<unknown>)({})

    expect(result).toEqual({ latest: '0.25.0' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
