import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import { defineComponent, h, onBeforeUnmount, onMounted, watch } from 'vue'
import { installHeroPointerTilt } from './heroTilt'
import './custom.css'

const Layout = defineComponent({
  setup(_props, { slots }) {
    const route = useRoute()
    let pointerTilt: ReturnType<typeof installHeroPointerTilt> | undefined

    onMounted(() => {
      pointerTilt = installHeroPointerTilt()
    })

    watch(() => route.path, () => pointerTilt?.reset(), { flush: 'post' })
    onBeforeUnmount(() => pointerTilt?.destroy())

    return () => h(DefaultTheme.Layout, null, slots)
  },
})

export default { extends: DefaultTheme, Layout }
