import { renderReleaseHtml, parseChangelog } from '../server/utils/changelog'

describe('renderReleaseHtml', () => {
  it('renders markdown headings and lists to html', () => {
    const html = renderReleaseHtml("## What's Changed\n\n* fix one\n* fix two")
    expect(html).toContain('<h2')
    expect(html).toContain('<li>fix one</li>')
  })

  it('strips script tags and their content', () => {
    const html = renderReleaseHtml('hello <script>alert(1)</script> world')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
  })

  it('strips on* event-handler attributes', () => {
    const html = renderReleaseHtml('<img src="x" onerror="alert(1)">')
    expect(html).not.toMatch(/onerror/i)
  })

  it('strips javascript: hrefs', () => {
    const html = renderReleaseHtml('[click](javascript:alert(1))')
    expect(html).not.toMatch(/javascript:/i)
  })

  it('returns empty string for null body', () => {
    expect(renderReleaseHtml(null)).toBe('')
  })
})

describe('parseChangelog', () => {
  const fixture = `
## [0.23.4] — 2026-06-05

### Fixed
- Bug A was fixed.

## [0.23.3] — 2026-06-04

### Fixed
- Bug B was fixed.

### Added
- New feature.

## [0.20.x and earlier]

See GitHub for details.
`.trim()

  it('parses versions in order (newest first)', () => {
    const releases = parseChangelog(fixture)
    expect(releases.map(r => r.version)).toEqual(['0.23.4', '0.23.3'])
  })

  it('extracts date from heading', () => {
    const releases = parseChangelog(fixture)
    expect(releases[0]?.published_at).toBe('2026-06-05')
    expect(releases[1]?.published_at).toBe('2026-06-04')
  })

  it('sets name to v-prefixed version', () => {
    const releases = parseChangelog(fixture)
    expect(releases[0]?.name).toBe('v0.23.4')
  })

  it('renders section body as html', () => {
    const releases = parseChangelog(fixture)
    expect(releases[0]?.html).toContain('<li>')
  })

  it('skips non-semver headings', () => {
    const releases = parseChangelog(fixture)
    expect(releases.every(r => /^\d+\.\d+\.\d+$/.test(r.version))).toBe(true)
  })

  it('returns null published_at when date is absent', () => {
    const md = '## [1.0.0]\n\nSome content.'
    const releases = parseChangelog(md)
    expect(releases[0]?.published_at).toBeNull()
  })

  it('returns empty array for empty markdown', () => {
    expect(parseChangelog('')).toEqual([])
  })
})
