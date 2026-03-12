type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'switch-manager-theme'

export function useTheme() {
  const theme = useState<ThemeMode>('theme-mode', () => 'light')

  function applyTheme(mode: ThemeMode) {
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', mode)
      localStorage.setItem(STORAGE_KEY, mode)
    }
    theme.value = mode
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function initTheme() {
    if (!import.meta.client) return

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored)
      return
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }

  return {
    theme,
    applyTheme,
    toggleTheme,
    initTheme
  }
}
