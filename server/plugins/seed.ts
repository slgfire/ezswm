import { JsonFileStore } from '../storage/file-store'
import { defaultLayouts, defaultNetworks, defaultSwitches } from '../storage/seed'

export default defineNitroPlugin(async () => {
  const switchStore = new JsonFileStore('switches.json')
  const networkStore = new JsonFileStore('networks.json')
  const layoutStore = new JsonFileStore('layouts.json')

  await switchStore.read(defaultSwitches)
  await networkStore.read(defaultNetworks)
  await layoutStore.read(defaultLayouts)
})
