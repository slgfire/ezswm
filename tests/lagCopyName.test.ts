import { describe, expect, it } from 'vitest'
import { suggestLagCopyName } from '../app/utils/lagCopyName'

describe('suggestLagCopyName', () => {
  it('keeps the copy marker and limit when the source is long', () => {
    const name = suggestLagCopyName('x'.repeat(150), [])
    expect(name).toBe(`${'x'.repeat(93)} (copy)`)
    expect(name.length).toBeLessThanOrEqual(100)
  })

  it('checks uniqueness after truncating the name', () => {
    const existing = [`${'x'.repeat(93)} (copy)`, `${'x'.repeat(91)} (copy) 2`]
    const name = suggestLagCopyName('x'.repeat(150), existing)
    expect(name).toBe(`${'x'.repeat(91)} (copy) 3`)
    expect(existing).not.toContain(name)
    expect(name.length).toBeLessThanOrEqual(100)
  })

  it('limits UTF-16 length for emoji source names', () => {
    expect(suggestLagCopyName('😀'.repeat(50), []).length).toBeLessThanOrEqual(100)
    expect(suggestLagCopyName('😀'.repeat(100), []).length).toBeLessThanOrEqual(100)
  })

  it('removes all trailing high surrogates before the suffix', () => {
    const name = suggestLagCopyName(`${'x'.repeat(91)}\uD800\uD800`, [])
    const suffix = ' (copy)'

    expect(name.length).toBeLessThanOrEqual(100)
    expect(name.at(-(suffix.length + 1))).not.toMatch(/[\uD800-\uDBFF]/)
  })

  it('keeps unique suffix behavior after UTF-16 truncation', () => {
    const source = '😀'.repeat(100)
    const first = suggestLagCopyName(source, [])
    const second = suggestLagCopyName(source, [first])

    expect(second).toBe(`${'😀'.repeat(45)} (copy) 2`)
    expect(second.length).toBeLessThanOrEqual(100)
    expect(second).not.toBe(first)
  })
})
