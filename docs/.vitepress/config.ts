import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const GITHUB_REPO = 'https://github.com/slgfire/ezswm'

export default withMermaid(
  defineConfig({
    title: 'ezSWM Docs',
    description: 'Documentation for ezSWM — Switch & IP Management',
    lang: 'en-US',
    base: '/ezswm/',
    appearance: 'dark',
    cleanUrls: true,
    lastUpdated: true,

    head: [
      ['link', { rel: 'icon', href: '/favicon.svg' }],
    ],

    themeConfig: {
      logo: '/logo.png',

      nav: [
        { text: 'Guide', link: '/guide/installation' },
        { text: 'API Reference', link: '/api/reference' },
        { text: 'GitHub', link: GITHUB_REPO },
      ],

      sidebar: {
        '/guide/': [
          {
            text: 'Guide',
            items: [
              { text: 'Installation', link: '/guide/installation' },
              { text: 'User Guide', link: '/guide/user-guide' },
              { text: 'FAQ & Troubleshooting', link: '/guide/faq' },
            ],
          },
        ],
        '/api/': [
          {
            text: 'API',
            items: [
              { text: 'API Reference', link: '/api/reference' },
            ],
          },
        ],
      },

      editLink: {
        pattern: `${GITHUB_REPO}/edit/main/docs/:path`,
        text: 'Edit this page on GitHub',
      },

      socialLinks: [
        { icon: 'github', link: GITHUB_REPO },
      ],

      search: {
        provider: 'local',
      },

      footer: {
        message: 'Released under the GPL-3.0 License.',
        copyright: 'Copyright © 2026 SaarLAN / SLG e.V.',
      },
    },
  })
)
