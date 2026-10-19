import { describe, expect, it } from 'vitest'
import { resolveStartSite } from '../app/utils/startSite'

const sites = [
  { id: 'site-a', name: 'Alpha' },
  { id: 'site-z', name: 'Zulu' }
]

describe('resolveStartSite', () => {
  it('uses a valid preferred site', () => {
    expect(resolveStartSite(sites, 'site-z')).toBe(sites[1])
  })

  it('uses the alphabetically first site for automatic or unknown preferences', () => {
    expect(resolveStartSite(sites, null)).toBe(sites[0])
    expect(resolveStartSite(sites, 'deleted-site')).toBe(sites[0])
  })

  it('keeps API order when locale collation would sort names differently', () => {
    const sqliteOrderedSites = [
      { id: 'upper-z', name: 'Zeta' },
      { id: 'lower-a', name: 'alpha' }
    ]
    expect(resolveStartSite(sqliteOrderedSites, null)).toBe(sqliteOrderedSites[0])
  })

  it('returns no site when the list is empty', () => {
    expect(resolveStartSite([], 'deleted-site')).toBeUndefined()
  })
})
