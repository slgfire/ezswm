import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const projectRequire = createRequire(import.meta.url)
const nuxtRequire = createRequire(projectRequire.resolve('nuxt/package.json'))
const { ref } = nuxtRequire('vue')

const localInput = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

describe('API token UI helpers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('resolves every API-token component label in English and German', () => {
    const component = readFileSync(new URL('../app/components/settings/ApiTokensSection.vue', import.meta.url), 'utf8')
    const keys = [...component.matchAll(/\bt\('([^']+)'/g)].map(match => match[1]!)
    keys.push(...['invalid', 'past', 'too_far'].map(error => `settings.account.apiTokens.expiryErrors.${error}`))
    expect(keys.length).toBeGreaterThan(30)
    for (const language of ['en', 'de']) {
      const messages: unknown = JSON.parse(readFileSync(new URL(`../i18n/locales/${language}.json`, import.meta.url), 'utf8'))
      for (const key of keys) {
        let value = messages
        for (const part of key.split('.')) {
          value = typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[part] : undefined
        }
        expect(value, `${language}: ${key}`).toBeTypeOf('string')
      }
    }
  })

  it('omits blank expiry and converts a future local date to UTC', async () => {
    const { parseApiTokenExpiry } = await import('../app/utils/apiTokens')
    const now = new Date(2030, 0, 1, 0, 0)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    expect(parseApiTokenExpiry('', now)).toEqual({ expiresAt: undefined })
    expect(parseApiTokenExpiry(localInput(tomorrow), now)).toEqual({ expiresAt: tomorrow.toISOString() })
  })

  it('rejects invalid, current, past and over-five-year expiry values', async () => {
    const { parseApiTokenExpiry } = await import('../app/utils/apiTokens')
    const now = new Date(2030, 0, 1, 0, 0)
    const past = new Date(now.getTime() - 60_000)
    const tooFar = new Date(now)
    tooFar.setFullYear(tooFar.getFullYear() + 6)

    expect(parseApiTokenExpiry('not-a-date', now)).toEqual({ error: 'invalid' })
    expect(parseApiTokenExpiry(localInput(now), now)).toEqual({ error: 'past' })
    expect(parseApiTokenExpiry(localInput(past), now)).toEqual({ error: 'past' })
    expect(parseApiTokenExpiry(localInput(tooFar), now)).toEqual({ error: 'too_far' })
  })

  it('keeps the one-time secret out of the metadata list and uses only self-management routes', async () => {
    const calls: Array<{ url: string, options?: Record<string, unknown> }> = []
    const created = {
      id: 'token-1',
      name: 'Desktop app',
      created_at: '2030-01-01T00:00:00.000Z',
      last_used_at: null,
      expires_at: null,
      token: 'ezswm_test_once_only_secret'
    }
    const apiFetch = vi.fn((url: string, options?: Record<string, unknown>) => {
      calls.push({ url, options })
      if (url === '/api/auth/tokens' && !options?.method) return Promise.resolve([])
      if (url === '/api/auth/tokens' && options?.method === 'POST') return Promise.resolve(created)
      return Promise.resolve(undefined)
    })
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('useApiFetch', () => ({ apiFetch }))

    const { useApiTokens } = await import('../app/composables/useApiTokens')
    const apiTokens = useApiTokens()
    expect(await apiTokens.fetch()).toBe(true)
    const secret = await apiTokens.create({ name: 'Desktop app' })
    expect(secret === created.token).toBe(true)
    expect(apiTokens.tokens.value).toEqual([{
      id: 'token-1',
      name: 'Desktop app',
      created_at: '2030-01-01T00:00:00.000Z',
      last_used_at: null,
      expires_at: null
    }])
    expect(JSON.stringify(apiTokens.tokens.value).includes(created.token)).toBe(false)
    expect(JSON.stringify(apiTokens.tokens.value).includes('token_hash')).toBe(false)
    expect(calls.map(call => [call.url, call.options?.method ?? 'GET'])).toEqual([
      ['/api/auth/tokens', 'GET'],
      ['/api/auth/tokens', 'POST']
    ])
    expect(calls[1]?.options?.body).toEqual({ name: 'Desktop app' })

    await apiTokens.revoke('token-1')
    expect(calls[2]?.url).toBe('/api/auth/tokens/token-1')
    expect(calls[2]?.options?.method).toBe('DELETE')
    await apiTokens.revokeAll()
    expect(calls[3]?.url).toBe('/api/auth/tokens')
    expect(calls[3]?.options?.method).toBe('DELETE')
  })
})
