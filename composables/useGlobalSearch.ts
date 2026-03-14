import type { IpAllocation, IpRange, Network, Switch } from '~/types/models'

export interface GlobalSearchResult {
  id: string
  group: 'Pages' | 'Switches' | 'Networks' | 'IP allocations' | 'IP ranges'
  title: string
  description: string
  to: string
  score: number
}

interface SearchSource {
  switches: Switch[]
  networks: Network[]
  allocations: IpAllocation[]
  ranges: IpRange[]
}

interface SearchableItem {
  id: string
  group: GlobalSearchResult['group']
  title: string
  description: string
  to: string
  fields: string[]
}

const pageItems: SearchableItem[] = [
  {
    id: 'page-dashboard',
    group: 'Pages',
    title: 'Dashboard',
    description: 'Network operations overview',
    to: '/',
    fields: ['dashboard', 'overview', 'home', 'operations']
  },
  {
    id: 'page-switches',
    group: 'Pages',
    title: 'Switches',
    description: 'Switch inventory and lifecycle',
    to: '/switches',
    fields: ['switches', 'inventory', 'ports']
  },
  {
    id: 'page-networks',
    group: 'Pages',
    title: 'Networks',
    description: 'Subnets, ranges, and IP allocations',
    to: '/networks',
    fields: ['networks', 'ipam', 'subnet', 'vlan', 'ranges', 'allocations']
  },
  {
    id: 'page-settings',
    group: 'Pages',
    title: 'Settings',
    description: 'System configuration and defaults',
    to: '/settings',
    fields: ['settings', 'configuration', 'defaults']
  },
  {
    id: 'page-settings-general',
    group: 'Pages',
    title: 'Settings · General',
    description: 'Global system preferences',
    to: '/settings/general',
    fields: ['settings', 'general', 'preferences']
  },
  {
    id: 'page-settings-switch-models',
    group: 'Pages',
    title: 'Settings · Switch models',
    description: 'Standardized model definitions',
    to: '/settings/switch-models',
    fields: ['settings', 'switch models', 'models', 'vendor']
  },
  {
    id: 'page-settings-port-layouts',
    group: 'Pages',
    title: 'Settings · Port layouts',
    description: 'Reusable port layout templates',
    to: '/settings/port-layouts',
    fields: ['settings', 'layouts', 'ports', 'templates']
  },
  {
    id: 'page-settings-ipam-defaults',
    group: 'Pages',
    title: 'Settings · IPAM defaults',
    description: 'Default network allocation settings',
    to: '/settings/ipam-defaults',
    fields: ['settings', 'ipam', 'defaults', 'allocations']
  },
  {
    id: 'page-settings-appearance',
    group: 'Pages',
    title: 'Settings · Appearance',
    description: 'Theme and visual preferences',
    to: '/settings/appearance',
    fields: ['settings', 'appearance', 'theme', 'dark mode']
  }
]

const normalize = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '')

const toDisplay = (value: unknown): string => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : '—')

const toNumberDisplay = (value: unknown): string => (typeof value === 'number' ? String(value) : '')

const scoreItem = (item: SearchableItem, query: string): number => {
  if (!query) return 0

  const combined = normalize([item.title, item.description, ...item.fields].join(' '))
  const tokens = query.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0

  if (!tokens.every((token) => combined.includes(token))) return 0

  const title = normalize(item.title)
  const fields = item.fields.map((field) => normalize(field))

  let score = 10
  if (title === query) score += 80
  if (title.startsWith(query)) score += 50
  if (fields.some((field) => field === query)) score += 40
  if (fields.some((field) => field.startsWith(query))) score += 25
  if (combined.includes(query)) score += 15

  return score
}

export const useGlobalSearch = (query: Ref<string>) => {
  const { data, pending, error, refresh } = useAsyncData<SearchSource>(
    'global-search-source',
    () => $fetch('/api/search'),
    {
      default: () => ({ switches: [], networks: [], allocations: [], ranges: [] })
    }
  )

  const indexedItems = computed<SearchableItem[]>(() => {
    const source = data.value
    const networksById = new Map(source.networks.map((network) => [network.id, network]))

    const switchItems = source.switches.map<SearchableItem>((entry) => ({
      id: `switch-${entry.id}`,
      group: 'Switches',
      title: entry.name,
      description: `Mgmt IP ${toDisplay(entry.managementIp)} · ${toDisplay(entry.vendor)} ${toDisplay(entry.model)}`,
      to: `/switches/${entry.id}`,
      fields: [
        entry.name,
        entry.vendor,
        entry.model,
        entry.managementIp,
        entry.serialNumber,
        entry.status,
        ...(entry.tags ?? [])
      ].map((field) => toDisplay(field))
    }))

    const networkItems = source.networks.map<SearchableItem>((entry) => ({
      id: `network-${entry.id}`,
      group: 'Networks',
      title: entry.name,
      description: `VLAN ${toNumberDisplay(entry.vlanId) || '—'} · ${entry.subnet}/${entry.prefix}`,
      to: `/networks/${entry.id}`,
      fields: [
        entry.name,
        toNumberDisplay(entry.vlanId),
        entry.subnet,
        toNumberDisplay(entry.prefix),
        entry.gateway,
        entry.netmask,
        ...(entry.tags ?? [])
      ].map((field) => toDisplay(field))
    }))

    const allocationItems = source.allocations.map<SearchableItem>((entry) => {
      const network = networksById.get(entry.networkId)

      return {
        id: `allocation-${entry.id}`,
        group: 'IP allocations',
        title: entry.ipAddress,
        description: `${toDisplay(entry.hostname || entry.deviceName || entry.serviceName)} · ${network?.name ?? 'Unknown network'}`,
        to: network ? `/networks/${network.id}` : '/networks',
        fields: [
          entry.ipAddress,
          entry.hostname,
          entry.deviceName,
          entry.serviceName,
          entry.status,
          entry.description,
          network?.name,
          network?.subnet,
          toNumberDisplay(network?.vlanId)
        ].map((field) => toDisplay(field))
      }
    })

    const rangeItems = source.ranges.map<SearchableItem>((entry) => {
      const network = networksById.get(entry.networkId)

      return {
        id: `range-${entry.id}`,
        group: 'IP ranges',
        title: entry.name,
        description: `${entry.startIp} - ${entry.endIp} · ${network?.name ?? 'Unknown network'}`,
        to: network ? `/networks/${network.id}` : '/networks',
        fields: [
          entry.name,
          entry.type,
          entry.startIp,
          entry.endIp,
          entry.description,
          network?.name,
          network?.subnet,
          toNumberDisplay(network?.vlanId)
        ].map((field) => toDisplay(field))
      }
    })

    return [...pageItems, ...switchItems, ...networkItems, ...allocationItems, ...rangeItems]
  })

  const results = computed<GlobalSearchResult[]>(() => {
    const normalizedQuery = normalize(query.value)
    if (!normalizedQuery) return []

    return indexedItems.value
      .map((item) => ({ ...item, score: scoreItem(item, normalizedQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 30)
      .map((item) => ({
        id: item.id,
        group: item.group,
        title: item.title,
        description: item.description,
        to: item.to,
        score: item.score
      }))
  })

  const groupedResults = computed(() => {
    const groups = new Map<GlobalSearchResult['group'], GlobalSearchResult[]>()
    for (const item of results.value) {
      if (!groups.has(item.group)) groups.set(item.group, [])
      groups.get(item.group)?.push(item)
    }

    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }))
  })

  return {
    pending,
    error,
    refresh,
    results,
    groupedResults
  }
}
