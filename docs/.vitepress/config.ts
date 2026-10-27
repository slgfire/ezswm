import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const GITHUB_REPO = 'https://github.com/slgfire/ezswm'

const englishSidebar = [
  {
    text: 'Start here',
    items: [
      { text: 'Installation', link: '/guide/installation' },
      { text: 'User Guide', link: '/guide/user-guide' },
    ],
  },
  { text: 'Integration', items: [{ text: 'MCP Integration', link: '/guide/mcp' }] },
  { text: 'Help', items: [{ text: 'FAQ & Troubleshooting', link: '/guide/faq' }] },
  {
    text: 'Reference',
    items: [
      { text: 'API Reference', link: '/api/reference' },
      { text: 'Release Notes', link: '/release-notes' },
    ],
  },
]

const germanSidebar = [
  {
    text: 'Einstieg',
    items: [
      { text: 'Installation', link: '/de/guide/installation' },
      { text: 'Benutzerhandbuch', link: '/de/guide/user-guide' },
    ],
  },
  { text: 'Integrationen', items: [{ text: 'MCP-Anbindung', link: '/de/guide/mcp' }] },
  { text: 'Hilfe', items: [{ text: 'FAQ & Problemlösung', link: '/de/guide/faq' }] },
  {
    text: 'Referenz',
    items: [
      { text: 'API-Referenz', link: '/de/api/reference' },
      { text: 'Release Notes', link: '/de/release-notes' },
    ],
  },
]

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
            {
              text: 'Start here',
              items: [
                { text: 'Installation', link: '/guide/installation' },
                { text: 'User Guide', link: '/guide/user-guide' },
              ],
            },
            { text: 'Integration', link: '/guide/mcp' },
            { text: 'Help', link: '/guide/faq' },
            {
              text: 'Reference',
              items: [
                { text: 'API Reference', link: '/api/reference' },
                { text: 'Release Notes', link: '/release-notes' },
              ],
            },
            { text: 'GitHub', link: GITHUB_REPO },
          ],
          sidebar: englishSidebar,
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
            {
              text: 'Einstieg',
              items: [
                { text: 'Installation', link: '/de/guide/installation' },
                { text: 'Benutzerhandbuch', link: '/de/guide/user-guide' },
              ],
            },
            { text: 'Integrationen', link: '/de/guide/mcp' },
            { text: 'Hilfe', link: '/de/guide/faq' },
            {
              text: 'Referenz',
              items: [
                { text: 'API-Referenz', link: '/de/api/reference' },
                { text: 'Release Notes', link: '/de/release-notes' },
              ],
            },
            { text: 'GitHub', link: GITHUB_REPO },
          ],
          sidebar: germanSidebar,
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
      siteTitle: 'Docs',
      logo: {
        light: '/logo.svg',
        dark: '/logo-dark.svg',
        alt: 'ezSWM',
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
