import { describe, it, expect } from 'vitest'
import { slugify, resolveSlugCollision } from '../server/utils/slugify'

describe('slugify', () => {
  it('lowercases and replaces whitespace with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('transliterates German umlauts', () => {
    expect(slugify('München')).toBe('muenchen')
    expect(slugify('Straße')).toBe('strasse')
    expect(slugify('Über')).toBe('ueber')
  })

  it('transliterates common Latin accents', () => {
    expect(slugify('Café')).toBe('cafe')
    expect(slugify('Hôtel')).toBe('hotel')
  })

  it('collapses non-alphanumeric runs to a single dash', () => {
    expect(slugify('a___b...c')).toBe('a-b-c')
    expect(slugify('  spaces  ')).toBe('spaces')
  })

  it('trims leading and trailing dashes', () => {
    expect(slugify('---trim---me---')).toBe('trim-me')
  })

  it('caps at 60 characters and re-trims', () => {
    const long = 'a'.repeat(80)
    expect(slugify(long).length).toBeLessThanOrEqual(60)
  })

  it('falls back to "item" when input is empty or collapses to empty', () => {
    expect(slugify('')).toBe('item')
    expect(slugify('!!!')).toBe('item')
    expect(slugify('   ')).toBe('item')
  })
})

describe('resolveSlugCollision', () => {
  it('returns the desired slug if free', async () => {
    const result = await resolveSlugCollision('foo', async () => false)
    expect(result).toBe('foo')
  })

  it('appends -2 when the desired slug is taken', async () => {
    const taken = new Set(['foo'])
    const result = await resolveSlugCollision('foo', async (s) => taken.has(s))
    expect(result).toBe('foo-2')
  })

  it('keeps incrementing until a free slug is found', async () => {
    const taken = new Set(['foo', 'foo-2', 'foo-3'])
    const result = await resolveSlugCollision('foo', async (s) => taken.has(s))
    expect(result).toBe('foo-4')
  })
})
