import type { AppSettings, IpAllocation, IpRange, LayoutTemplate, Network, Port, Switch } from '~/types/models'
import { JsonStore } from './jsonStore'

export const getStores = () => {
  const config = useRuntimeConfig()
  const dataDir = config.dataDir as string

  return {
    switches: new JsonStore<Switch>(dataDir, 'switches.json'),
    ports: new JsonStore<Port>(dataDir, 'ports.json'),
    layouts: new JsonStore<LayoutTemplate>(dataDir, 'layouts.json'),
    networks: new JsonStore<Network>(dataDir, 'networks.json'),
    allocations: new JsonStore<IpAllocation>(dataDir, 'ip-allocations.json'),
    ranges: new JsonStore<IpRange>(dataDir, 'ip-ranges.json'),
    settings: new JsonStore<AppSettings & { id: string }>(dataDir, 'settings.json')
  }
}
