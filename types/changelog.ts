// Raw subset of the GitHub Releases API response we consume
export interface GithubRelease {
  tag_name: string
  name: string | null
  body: string | null
  draft: boolean
  prerelease: boolean
  published_at: string
  html_url: string
}

export interface ChangelogRelease {
  version: string       // tag_name with leading 'v' stripped
  name: string
  html: string          // sanitized rendered notes
  published_at: string
  url: string
}

export interface ChangelogResponse {
  latest: string                 // newest non-prerelease version, or "" if none
  releases: ChangelogRelease[]   // newest first
}
