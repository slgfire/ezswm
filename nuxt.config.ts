export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/main.css'],
  app: {
    head: {
      title: 'ezSWM — Switch Management'
    }
  },
  colorMode: {
    preference: 'system',
    fallback: 'dark',
    classSuffix: ''
  },
  runtimeConfig: {
    dataDir: process.env.DATA_DIR || 'data'
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
})
