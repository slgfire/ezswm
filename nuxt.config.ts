export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n'
  ],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' }
    ],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'no_prefix'
  },

  colorMode: {
    preference: 'dark'
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || '',
    dataDir: process.env.DATA_DIR || './data',
    public: {
      appVersion: '0.1.0'
    }
  },

  typescript: {
    strict: true
  },

  devtools: {
    enabled: true
  },

  compatibilityDate: '2025-03-16'
})
