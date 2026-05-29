import { renderReleaseHtml, transformReleases } from '../server/utils/changelog'
import type { GithubRelease } from '../types/changelog'

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

describe('transformReleases', () => {
  const base: GithubRelease = {
    tag_name: 'v0.0.0',
    name: null,
    body: null,
    draft: false,
    prerelease: false,
    published_at: '2026-01-01T00:00:00Z',
    html_url: 'https://example.com'
  }

  it('filters out draft and prerelease entries', () => {
    const result = transformReleases([
      { ...base, tag_name: 'v0.18.10' },
      { ...base, tag_name: 'v0.18.9-rc1', prerelease: true },
      { ...base, tag_name: 'v0.18.8', draft: true }
    ])
    expect(result.releases.map(r => r.version)).toEqual(['0.18.10'])
  })

  it('strips the leading v from tag_name', () => {
    const result = transformReleases([{ ...base, tag_name: 'v1.2.3' }])
    expect(result.releases[0]!.version).toBe('1.2.3')
  })

  it('sets latest to the first (newest) release version', () => {
    const result = transformReleases([
      { ...base, tag_name: 'v0.18.10' },
      { ...base, tag_name: 'v0.18.9' }
    ])
    expect(result.latest).toBe('0.18.10')
  })

  it('falls back to tag_name when name is null', () => {
    const result = transformReleases([{ ...base, tag_name: 'v1.0.0', name: null }])
    expect(result.releases[0]!.name).toBe('v1.0.0')
  })

  it('returns empty latest when there are no releases', () => {
    expect(transformReleases([]).latest).toBe('')
  })
})
