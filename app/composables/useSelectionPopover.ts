import type { Switch } from '~~/types/switch'

export function useSelectionPopover(
  filteredItems: Ref<Switch[]>,
  groupedItems: Ref<{ siteId: string; siteName: string; items: Switch[] }[]>
) {
  const selectedIds = ref<string[]>([])
  const search = ref('')

  const filteredList = computed(() => {
    const q = search.value.toLowerCase().trim()
    if (!q) return filteredItems.value
    return filteredItems.value.filter((sw) => sw.name.toLowerCase().includes(q))
  })

  const filteredGroups = computed(() => {
    const q = search.value.toLowerCase().trim()
    if (!q) return groupedItems.value
    return groupedItems.value
      .map((g) => ({ ...g, items: g.items.filter((sw) => sw.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0)
  })

  function toggle(swId: string) {
    const idx = selectedIds.value.indexOf(swId)
    if (idx >= 0) selectedIds.value.splice(idx, 1)
    else selectedIds.value.push(swId)
  }

  function selectAll(ids: string[]) {
    selectedIds.value = [...ids]
  }

  function deselectAll() {
    selectedIds.value = []
  }

  return reactive({ selectedIds, search, filteredList, filteredGroups, toggle, selectAll, deselectAll })
}
