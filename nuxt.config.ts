export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    dataDir: process.env.DATA_DIR || 'data'
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
})
