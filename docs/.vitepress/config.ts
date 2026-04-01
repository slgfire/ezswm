import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const GITHUB_REPO = 'https://github.com/slgfire/ezswm'

export default withMermaid(
  defineConfig({
    title: 'ezSWM Docs',
    description: 'Documentation for ezSWM — Switch & IP Management',
    base: '/ezswm/',
    appearance: 'dark',
    cleanUrls: true,
    lastUpdated: true,

    head: [
      ['link', { rel: 'icon', href: '/favicon.svg' }],
    ],

    locales: {
      root: {
        label: 'English',
        lang: 'en-US',
        themeConfig: {
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
        },
      },
      de: {
        label: 'Deutsch',
        lang: 'de-DE',
        link: '/de/',
        title: 'ezSWM Dokumentation',
        description: 'Dokumentation für ezSWM — Switch & IP Management',
        themeConfig: {
          nav: [
            { text: 'Handbuch', link: '/de/guide/installation' },
            { text: 'API-Referenz', link: '/de/api/reference' },
            { text: 'GitHub', link: GITHUB_REPO },
          ],
          sidebar: {
            '/de/guide/': [
              {
                text: 'Handbuch',
                items: [
                  { text: 'Installation', link: '/de/guide/installation' },
                  { text: 'Benutzerhandbuch', link: '/de/guide/user-guide' },
                  { text: 'FAQ & Problemlösung', link: '/de/guide/faq' },
                ],
              },
            ],
            '/de/api/': [
              {
                text: 'API',
                items: [
                  { text: 'API-Referenz', link: '/de/api/reference' },
                ],
              },
            ],
          },
          docFooter: {
            prev: 'Vorherige Seite',
            next: 'Nächste Seite',
          },
          darkModeSwitchLabel: 'Erscheinungsbild',
          returnToTopLabel: 'Nach oben',
          outlineLabel: 'Auf dieser Seite',
          lastUpdatedText: 'Zuletzt aktualisiert',
          editLink: {
            pattern: `${GITHUB_REPO}/edit/main/docs/:path`,
            text: 'Diese Seite auf GitHub bearbeiten',
          },
        },
      },
    },

    themeConfig: {
      logo: '/logo.png',

      editLink: {
        pattern: `${GITHUB_REPO}/edit/main/docs/:path`,
        text: 'Edit this page on GitHub',
      },

      socialLinks: [
        { icon: 'github', link: GITHUB_REPO },
      ],

      search: {
        provider: 'local',
        options: {
          locales: {
            de: {
              translations: {
                button: { buttonText: 'Suchen', buttonAriaLabel: 'Suchen' },
                modal: {
                  displayDetails: 'Details anzeigen',
                  resetButtonTitle: 'Suche zurücksetzen',
                  noResultsText: 'Keine Ergebnisse',
                  footer: {
                    selectText: 'Auswählen',
                    navigateText: 'Navigieren',
                    closeText: 'Schließen',
                  },
                },
              },
            },
          },
        },
      },

      footer: {
        message: 'Released under the GPL-3.0 License.',
        copyright: 'Copyright © 2026 Daniel Neudörfer',
      },
    },
  })
)
