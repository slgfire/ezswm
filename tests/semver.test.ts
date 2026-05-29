import { compareSemver } from '../app/utils/semver'

describe('compareSemver', () => {
  it('returns 1 when a > b', () => {
    expect(compareSemver('0.18.10', '0.18.9')).toBe(1)
  })

  it('returns -1 when a < b', () => {
    expect(compareSemver('0.18.9', '0.18.10')).toBe(-1)
  })

  it('returns 0 when equal', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0)
  })

  it('compares major then minor before patch', () => {
    expect(compareSemver('1.0.0', '0.99.99')).toBe(1)
    expect(compareSemver('0.19.0', '0.18.99')).toBe(1)
  })

  it('treats missing segments as 0', () => {
    expect(compareSemver('1', '1.0.0')).toBe(0)
    expect(compareSemver('1.2', '1.2.1')).toBe(-1)
  })
})
