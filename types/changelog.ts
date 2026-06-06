export interface ChangelogRelease {
  version: string
  name: string
  html: string
  published_at: string | null
}

export interface ChangelogResponse {
  latest: string
  releases: ChangelogRelease[]
}

export interface LatestVersionResponse {
  latest: string | null
}
