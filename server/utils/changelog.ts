import { marked } from 'marked'
import type { ChangelogRelease, ChangelogResponse } from '../../types/changelog'

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/\shref\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '')
}

export function renderReleaseHtml(markdown: string | null): string {
  if (!markdown) return ''
  const html = marked.parse(markdown, { async: false }) as string
  return sanitizeHtml(html)
}

// Pure function — no I/O. Used directly by tests.
export function parseChangelog(markdown: string): ChangelogRelease[] {
  // Split on lines that start a version section (## [x.y.z])
  const sections = markdown.split(/^(?=## \[)/m)
  const releases: ChangelogRelease[] = []

  for (const section of sections) {
    const lines = section.split('\n')
    const heading = lines[0] ?? ''

    // Extract version from ## [0.23.4] or ## [0.23.4] — 2026-06-05
    const versionMatch = heading.match(/^## \[([^\]]+)\]/)
    if (!versionMatch) continue

    const version = versionMatch[1]!
    // Only keep proper semver versions (skip e.g. [0.20.x and earlier])
    if (!/^\d+\.\d+\.\d+$/.test(version)) continue

    // Extract date from ## [0.23.4] — 2026-06-05
    const dateMatch = heading.match(/[—–-]\s*(\d{4}-\d{2}-\d{2})/)
    const published_at = dateMatch ? dateMatch[1]! : null

    const body = lines.slice(1).join('\n').trim()

    releases.push({
      version,
      name: `v${version}`,
      html: renderReleaseHtml(body),
      published_at
    })
  }

  // File is already newest-first; return as-is
  return releases
}

// Reads from Nitro server asset storage.
export async function loadChangelog(locale: string): Promise<ChangelogResponse> {
  const normalized = locale === 'de' ? 'de' : 'en'
  const storage = useStorage('assets:server')
  let md = await storage.getItem<string>(`changelog:${normalized}.md`)
  if (!md && normalized !== 'en') {
    md = await storage.getItem<string>('changelog:en.md')
  }
  const releases = md ? parseChangelog(md) : []
  return { latest: releases[0]?.version ?? '', releases }
}
