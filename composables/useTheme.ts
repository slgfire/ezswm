type ThemeMode = 'light' | 'dark'

export function useTheme() {
  const colorMode = useColorMode()

  const theme = computed<ThemeMode>(() => colorMode.value === 'dark' ? 'dark' : 'light')

  function applyTheme(mode: ThemeMode) {
    colorMode.preference = mode
    colorMode.value = mode
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function initTheme() {
    if (colorMode.value === 'system') {
      colorMode.preference = 'system'
    }
  }

  return {
    theme,
    applyTheme,
    toggleTheme,
    initTheme
  }
}
