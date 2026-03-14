export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  typescript: { strict: true },
  colorMode: { preference: 'system' },
  app: {
    head: {
      title: 'ezSWM',
      meta: [{ name: 'description', content: 'Easy Switch and IP Management' }]
    }
  },
  runtimeConfig: {
    dataDir: process.env.DATA_DIR || '/app/data'
  },
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'de', file: 'de.json', name: 'Deutsch' }
    ],
    lazy: true,
    langDir: 'i18n/locales',
    strategy: 'no_prefix'
  },
  ui: {
    global: true,
    icons: ['heroicons'],
    primary: 'green'
  }
})
