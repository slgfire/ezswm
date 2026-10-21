import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'home-hero-image': () => h('div', { class: 'docs-home-logo' }, [
      h('img', { src: '/logo.svg', alt: 'ezSWM Logo', class: 'docs-home-logo-light' }),
      h('img', { src: '/logo-dark.svg', alt: 'ezSWM Logo', class: 'docs-home-logo-dark' }),
    ]),
  }),
}
