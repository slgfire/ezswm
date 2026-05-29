import type { ChangelogResponse, ChangelogRelease } from '~~/types/changelog'

export function useVersionCheck() {
  const config = useRuntimeConfig()
  const current = config.public.appVersion as string

  const releases = useState<ChangelogRelease[]>('changelog-releases', () => [])
  const latest = useState<string>('changelog-latest', () => '')
  const loaded = useState<boolean>('changelog-loaded', () => false)
  const failed = useState<boolean>('changelog-failed', () => false)

  async function load() {
    if (loaded.value) return
    try {
      const data = await $fetch<ChangelogResponse>('/api/changelog')
      releases.value = data.releases
      latest.value = data.latest
      loaded.value = true
    } catch {
      failed.value = true
    }
  }

  const updateAvailable = computed(
    () => Boolean(latest.value) && compareSemver(latest.value, current) === 1
  )

  return { current, latest, releases, loaded, failed, load, updateAvailable }
}
