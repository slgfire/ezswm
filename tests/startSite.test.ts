import { describe, expect, it } from 'vitest'
import {
  getLastVisitedSiteId,
  rememberLastVisitedSite,
  resolveStartSite
} from '../app/utils/startSite'

const sites = [
  { id: 'site-a', name: 'Alpha' },
  { id: 'site-z', name: 'Zulu' }
]

describe('resolveStartSite', () => {
  it('uses a valid preferred site', () => {
    expect(resolveStartSite(sites, 'site-z')).toBe(sites[1])
  })

  it('uses the last visited site for Automatic, unless a valid fixed preference wins', () => {
    expect(resolveStartSite(sites, null, 'site-z')).toBe(sites[1])
    expect(resolveStartSite(sites, 'site-a', 'site-z')).toBe(sites[0])
  })

  it('falls back to the first API-ordered site when the preference or history is stale', () => {
    expect(resolveStartSite(sites, null, 'deleted-site')).toBe(sites[0])
    expect(resolveStartSite(sites, 'deleted-site', 'also-deleted')).toBe(sites[0])
    expect(resolveStartSite(sites, null)).toBe(sites[0])
  })

  it('keeps API order when locale collation would sort names differently', () => {
    const sqliteOrderedSites = [
      { id: 'upper-z', name: 'Zeta' },
      { id: 'lower-a', name: 'alpha' }
    ]
    expect(resolveStartSite(sqliteOrderedSites, null)).toBe(sqliteOrderedSites[0])
  })

  it('returns no site when the list is empty', () => {
    expect(resolveStartSite([], 'deleted-site', 'also-deleted')).toBeUndefined()
  })
})

describe('last visited site storage', () => {
  it('keeps visit history separate for each user account', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    }

    rememberLastVisitedSite('user-a', 'site-a', storage)
    rememberLastVisitedSite('user-b', 'site-z', storage)

    expect(getLastVisitedSiteId('user-a', storage)).toBe('site-a')
    expect(getLastVisitedSiteId('user-b', storage)).toBe('site-z')
    expect(getLastVisitedSiteId(undefined, storage)).toBeNull()
  })

  it('ignores unavailable or blocked browser storage', () => {
    const blockedStorage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') }
    }

    expect(getLastVisitedSiteId('user-a', blockedStorage)).toBeNull()
    expect(() => rememberLastVisitedSite('user-a', 'site-a', blockedStorage)).not.toThrow()
  })
})
