export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@nuxtjs/google-fonts'
  ],

  googleFonts: {
    families: {
      'JetBrains Mono': [400, 500, 600, 700],
      'IBM Plex Sans': [300, 400, 500, 600, 700]
    },
    display: 'swap'
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' }
    ],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'no_prefix'
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark'
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || '',
    dataDir: process.env.DATA_DIR || './data',
    public: {
      appVersion: '0.2.0'
    }
  },

  typescript: {
    strict: true
  },

  devtools: {
    enabled: true
  },

  devServer: {
    host: '0.0.0.0'
  },

  compatibilityDate: '2025-03-16'
})
