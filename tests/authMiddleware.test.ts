import { afterEach, describe, expect, it, vi } from 'vitest'

describe('auth middleware path extraction', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('uses path-only extraction and does not touch getRequestURL for public route checks', async () => {
    const getRequestPath = vi.fn().mockReturnValue('/api/health')
    const getMethod = vi.fn().mockReturnValue('GET')
    const getRequestURL = vi.fn(() => { throw new Error('Invalid URL') })

    vi.stubGlobal('getRequestPath', getRequestPath)
    vi.stubGlobal('getMethod', getMethod)
    vi.stubGlobal('getRequestURL', getRequestURL)

    const { default: handler } = await import('../server/middleware/auth')

    // The middleware is async (DB-authoritative user lookup): await the real result.
    await expect((handler as (event: unknown) => Promise<unknown>)({})).resolves.toBeUndefined()
    expect(getRequestPath).toHaveBeenCalledTimes(1)
    expect(getRequestURL).not.toHaveBeenCalled()
  })
  it('rejects a protected path without a token (401) and lets OIDC start/callback/status through', async () => {
    const stubFor = (path: string) => {
      vi.stubGlobal('getRequestPath', vi.fn().mockReturnValue(path))
      vi.stubGlobal('getMethod', vi.fn().mockReturnValue('GET'))
      vi.stubGlobal('getHeader', vi.fn().mockReturnValue(undefined))
      vi.stubGlobal('getCookie', vi.fn().mockReturnValue(undefined))
    }
    const { default: handler } = await import('../server/middleware/auth')
    const run = handler as (event: unknown) => Promise<unknown>

    stubFor('/api/sites')
    await expect(run({})).rejects.toMatchObject({ statusCode: 401 })
    stubFor('/api/auth/oidc/config')
    await expect(run({})).rejects.toMatchObject({ statusCode: 401 })
    for (const p of ['/api/auth/oidc/start', '/api/auth/oidc/callback', '/api/auth/oidc/status']) {
      stubFor(p)
      await expect(run({}), p).resolves.toBeUndefined()
    }
  })
})
