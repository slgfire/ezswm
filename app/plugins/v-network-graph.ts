import VNetworkGraph from 'v-network-graph'
import 'v-network-graph/lib/style.css'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VNetworkGraph)
})
