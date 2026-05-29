import { marked } from 'marked'
import type { GithubRelease, ChangelogResponse } from '../../types/changelog'

export const RELEASES_API_URL = 'https://api.github.com/repos/slgfire/ezswm/releases'

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

export function transformReleases(raw: GithubRelease[]): ChangelogResponse {
  const releases = raw
    .filter(r => !r.draft && !r.prerelease)
    .map(r => ({
      version: r.tag_name.replace(/^v/, ''),
      name: r.name || r.tag_name,
      html: renderReleaseHtml(r.body),
      published_at: r.published_at,
      url: r.html_url
    }))
  return {
    latest: releases[0]?.version ?? '',
    releases
  }
}
