import type { Switch } from '~~/types/switch'

export function useSwitchListFilters(
  allItems: Ref<Switch[]>,
  siteId: Ref<string>,
  siteMap: Ref<Record<string, string>>
) {
  const search = ref('')
  const locationFilter = ref<string | undefined>(undefined)
  const roleFilter = ref<string | undefined>(undefined)
  const tagFilter = ref<string | undefined>(undefined)

  const filteredItems = computed(() => {
    let result = [...allItems.value]

    if (search.value) {
      const q = search.value.toLowerCase()
      result = result.filter((s) =>
        s.name?.toLowerCase().includes(q) || s.model?.toLowerCase().includes(q) ||
        s.management_ip?.toLowerCase().includes(q) || s.serial_number?.toLowerCase().includes(q) ||
        s.manufacturer?.toLowerCase().includes(q)
      )
    }

    if (locationFilter.value) {
      result = result.filter((s) => s.location === locationFilter.value)
    }

    if (roleFilter.value) {
      result = result.filter((s) => s.role === roleFilter.value)
    }

    if (tagFilter.value) {
      result = result.filter((s) => s.tags?.includes(tagFilter.value!))
    }

    // Sort favorites first
    result.sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1
      if (!a.is_favorite && b.is_favorite) return 1
      return 0
    })

    return result
  })

  const groupedItems = computed(() => {
    if (siteId.value !== 'all') return [{ siteId: '', siteName: '', items: filteredItems.value }]
    const groups: { siteId: string; siteName: string; items: Switch[] }[] = []
    const groupMap = new Map<string, Switch[]>()
    for (const item of filteredItems.value) {
      const sid = item.site_id || ''
      if (!groupMap.has(sid)) groupMap.set(sid, [])
      groupMap.get(sid)!.push(item)
    }
    for (const [sid, items] of groupMap) {
      groups.push({ siteId: sid, siteName: siteMap.value[sid] || sid, items })
    }
    return groups
  })

  return { search, locationFilter, roleFilter, tagFilter, filteredItems, groupedItems }
}
