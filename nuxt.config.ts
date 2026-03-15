export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  future: {
    compatibilityVersion: 4
  },
  runtimeConfig: {
    dataDir: process.env.EZSWM_DATA_DIR || '/app/data'
  },
  i18n: {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [{ code: 'en', name: 'English', file: 'en.json' }],
    lazy: true,
    langDir: 'locales'
  },
  compatibilityDate: '2025-01-01'
})
