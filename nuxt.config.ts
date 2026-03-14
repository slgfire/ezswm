export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  app: {
    head: {
      title: 'ezSWM'
    }
  },
  runtimeConfig: {
    dataDir: process.env.EZSWM_DATA_DIR || '/app/data',
    public: {
      appName: 'ezSWM'
    }
  },
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' }
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    langDir: 'locales'
  },
  ui: {
    colorMode: true,
    theme: {
      colors: ['primary', 'neutral', 'error', 'warning', 'success', 'info']
    }
  }
})
