import { describe, expect, it, vi } from 'vitest'

describe('auth middleware path extraction', () => {
  it('uses path-only extraction and does not touch getRequestURL for public route checks', async () => {
    const getRequestPath = vi.fn().mockReturnValue('/api/health')
    const getMethod = vi.fn().mockReturnValue('GET')
    const getRequestURL = vi.fn(() => { throw new Error('Invalid URL') })

    vi.stubGlobal('getRequestPath', getRequestPath)
    vi.stubGlobal('getMethod', getMethod)
    vi.stubGlobal('getRequestURL', getRequestURL)

    const { default: handler } = await import('../server/middleware/auth')

    expect(() => (handler as (event: unknown) => unknown)({})).not.toThrow()
    expect(getRequestPath).toHaveBeenCalledTimes(1)
    expect(getRequestURL).not.toHaveBeenCalled()
  })
})
