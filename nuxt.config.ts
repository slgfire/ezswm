export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  ui: {
    colorMode: true,
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error']
    }
  },
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
      { code: 'de', language: 'de-DE', file: 'de.json', name: 'Deutsch' }
    ],
    strategy: 'no_prefix',
    langDir: 'i18n/locales'
  }
})
