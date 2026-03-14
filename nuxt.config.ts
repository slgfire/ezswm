export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  ui: {
    global: true,
    icons: ['heroicons']
  },
  app: {
    head: {
      title: 'ezSWM'
    }
  },
  runtimeConfig: {
    dataDir: process.env.DATA_DIR || 'data'
  },
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.json' },
      { code: 'de', iso: 'de-DE', name: 'Deutsch', file: 'de.json' }
    ],
    langDir: 'locales',
    strategy: 'no_prefix',
    lazy: true,
    detectBrowserLanguage: false
  },
  colorMode: {
    preference: 'system'
  }
})
