import type { ChangelogResponse, ChangelogRelease, LatestVersionResponse } from '~~/types/changelog'

export function useVersionCheck() {
  const config = useRuntimeConfig()
  const current = config.public.appVersion as string
  const { locale } = useI18n()

  const releases = useState<ChangelogRelease[]>('changelog-releases', () => [])
  const latest = useState<string>('changelog-latest', () => '')
  const loaded = useState<boolean>('changelog-loaded', () => false)
  const failed = useState<boolean>('changelog-failed', () => false)
  const loadedLocale = useState<string>('changelog-loaded-locale', () => '')

  async function load() {
    if (loaded.value && loadedLocale.value === locale.value) return
    try {
      const [data, versionData] = await Promise.all([
        $fetch<ChangelogResponse>('/api/changelog', { query: { locale: locale.value } }),
        $fetch<LatestVersionResponse>('/api/version-latest').catch(() => ({ latest: null }))
      ])
      releases.value = data.releases
      loaded.value = true
      loadedLocale.value = locale.value
      if (versionData.latest) latest.value = versionData.latest
    } catch {
      failed.value = true
    }
  }

  const updateAvailable = computed(
    () => Boolean(latest.value) && compareSemver(latest.value, current) === 1
  )

  return { current, latest, releases, loaded, failed, load, updateAvailable }
}
