export default defineNuxtConfig({
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

  app: {
    head: {
      title: 'ezSWM',
      titleTemplate: '%s — ezSWM',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
      ]
    }
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
