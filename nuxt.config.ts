import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// Dev-only h3 version pin. Nitro 2 / @nuxt/nitro-server run on h3 v1 events, but a dev-only
// transitive dependency (@nuxt/eslint -> @eslint/config-inspector -> devframe) pulls in h3 v2,
// which made Nitro's dev auto-imports (setHeader, getCookie, ...) resolve to v2 and crash on v1
// events. Resolve h3 from @nuxt/nitro-server's OWN dependency context (no hardcoded store paths)
// and alias Nitro's bare `h3` to that entry.
function resolveNitroH3(): string | undefined {
  try {
    const require = createRequire(import.meta.url)
    const nuxtDir = dirname(require.resolve('nuxt/package.json'))
    // @nuxt/nitro-server does not export ./package.json: resolve its entry from nuxt's own
    // context, then walk up to the package root.
    let dir = dirname(createRequire(join(nuxtDir, 'package.json')).resolve('@nuxt/nitro-server'))
    while (!existsSync(join(dir, 'package.json')) || JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name !== '@nuxt/nitro-server') {
      const parent = dirname(dir)
      if (parent === dir) throw new Error('@nuxt/nitro-server package root not found')
      dir = parent
    }
    const h3Pkg = require.resolve('h3/package.json', { paths: [dir] })
    return join(dirname(h3Pkg), 'dist/index.mjs')
  } catch (err) {
    console.warn('[ezSWM] Could not resolve the Nitro h3 entry; dev auto-imports may use the wrong h3 version:', err instanceof Error ? err.message : err)
    return undefined
  }
}
const nitroH3 = resolveNitroH3()

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@nuxt/eslint'
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
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
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
    // OIDC SSO: client-secret encryption key (32 bytes, base64/hex; must differ from JWT_SECRET)
    // and optional canonical public origin for the callback URL. Server-only (not public).
    oidcEncryptionKey: process.env.OIDC_ENCRYPTION_KEY || '',
    publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
    dataDir: process.env.DATA_DIR || './data',
    // Default DATABASE_URL is relative to /prisma (Prisma convention). In Docker
    // and production we set an absolute path via env.
    databaseUrl: process.env.DATABASE_URL || 'file:../data/db.sqlite',
    public: {
      appVersion: process.env.npm_package_version || '0.0.0'
    }
  },

  typescript: {
    strict: true,
    // Same v1 pin for the app/shared/node tsconfigs (see nitro.typescript below).
    ...(nitroH3 ? { tsConfig: { compilerOptions: { paths: { h3: [dirname(dirname(nitroH3))] } } } } : {})
  },

  devtools: {
    enabled: true
  },

  devServer: {
    host: '0.0.0.0'
  },

  nitro: {
    // Runtime alias + types: Nuxt hoists `h3` types from the project root (the dev-only v2), so
    // also put the v1 package first in the generated tsconfig `paths` (user entries win).
    ...(nitroH3
      ? {
          alias: { h3: nitroH3 },
          typescript: { tsConfig: { compilerOptions: { paths: { h3: [dirname(dirname(nitroH3))] } } } }
        }
      : {}),
    serverAssets: [
      { baseName: 'changelog', dir: '../CHANGELOG' }
    ]
  },

  compatibilityDate: '2025-03-16'
})
