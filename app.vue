<script setup lang="ts">
import type { GlobalSearchResult } from '~/composables/useGlobalSearch'

const route = useRoute()

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Network operations overview' },
  '/switches': { title: 'Switches', subtitle: 'Switch inventory and lifecycle' },
  '/networks': { title: 'Networks & IPAM', subtitle: 'Subnets, ranges, and allocations' },
  '/settings': { title: 'Settings', subtitle: 'System configuration and defaults' },
  '/settings/general': { title: 'Settings · General', subtitle: 'Global system preferences' },
  '/settings/switch-models': { title: 'Settings · Switch models', subtitle: 'Standardized model definitions' },
  '/settings/port-layouts': { title: 'Settings · Port layouts', subtitle: 'Reusable port layout templates' },
  '/settings/ipam-defaults': { title: 'Settings · IPAM defaults', subtitle: 'Default network allocation settings' },
  '/settings/appearance': { title: 'Settings · Appearance', subtitle: 'Theme and visual preferences' }
}

const navigationGroups = [
  {
    title: 'Operations',
    items: [{ label: 'Dashboard', to: '/', icon: '◉' }]
  },
  {
    title: 'Switching',
    items: [{ label: 'Switches', to: '/switches', icon: '⇆' }]
  },
  {
    title: 'Network',
    items: [{ label: 'Networks', to: '/networks', icon: '⌁' }]
  },
  {
    title: 'System',
    items: [{ label: 'Settings', to: '/settings', icon: '⚙' }]
  }
]

const headerMeta = computed(() => {
  const match = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => route.path === prefix || route.path.startsWith(`${prefix}/`))

  return match?.[1] || { title: 'ezSWM', subtitle: 'Switch and IP management' }
})

const searchQuery = ref('')
const isSearchOpen = ref(false)
const highlightedResultIndex = ref(-1)

const { results, pending: isSearchLoading, error: searchError, refresh: refreshSearch } = useGlobalSearch(searchQuery)

const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0)

const indexedResults = computed(() => results.value.map((result, index) => ({ ...result, index })))

const groupedIndexedResults = computed(() => {
  const groups = new Map<GlobalSearchResult['group'], Array<GlobalSearchResult & { index: number }>>()
  for (const result of indexedResults.value) {
    if (!groups.has(result.group)) groups.set(result.group, [])
    groups.get(result.group)?.push(result)
  }

  return Array.from(groups.entries()).map(([group, items]) => ({ group, items }))
})

const openSearch = () => {
  isSearchOpen.value = true
}

const closeSearch = () => {
  isSearchOpen.value = false
  highlightedResultIndex.value = -1
}

const onSearchFocus = () => {
  openSearch()
}

const onSearchBlur = () => {
  setTimeout(() => {
    closeSearch()
  }, 120)
}

const moveHighlightedIndex = (direction: 1 | -1) => {
  if (!results.value.length) {
    highlightedResultIndex.value = -1
    return
  }

  if (highlightedResultIndex.value < 0) {
    highlightedResultIndex.value = direction > 0 ? 0 : results.value.length - 1
    return
  }

  const nextIndex = highlightedResultIndex.value + direction
  if (nextIndex < 0) {
    highlightedResultIndex.value = results.value.length - 1
    return
  }

  highlightedResultIndex.value = nextIndex % results.value.length
}

const selectResult = async (result: GlobalSearchResult) => {
  searchQuery.value = ''
  closeSearch()
  await navigateTo(result.to)
}

const onSearchKeydown = async (event: KeyboardEvent) => {
  if (!isSearchOpen.value && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
    openSearch()
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveHighlightedIndex(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveHighlightedIndex(-1)
    return
  }

  if (event.key === 'Enter' && highlightedResultIndex.value >= 0) {
    event.preventDefault()
    const selected = results.value[highlightedResultIndex.value]
    if (selected) await selectResult(selected)
    return
  }

  if (event.key === 'Escape') {
    closeSearch()
  }
}

const handleRefreshClick = async () => {
  await refreshSearch()
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand panel">
        <p class="sidebar-brand__title">ezSWM</p>
        <small>Easy Switch and IP Management</small>
      </div>

      <nav class="sidebar-nav">
        <div v-for="group in navigationGroups" :key="group.title" class="nav-group">
          <p class="nav-group__title">{{ group.title }}</p>
          <NuxtLink v-for="item in group.items" :key="item.label" :to="item.to" class="nav-item">
            <span class="nav-item__icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </nav>
    </aside>

    <div class="content">
      <header class="topbar panel panel--flat">
        <div>
          <h2 class="topbar-title">{{ headerMeta.title }}</h2>
          <small>{{ headerMeta.subtitle }}</small>
        </div>
        <div class="row topbar-actions">
          <div class="topbar-search-wrap">
            <input
              v-model="searchQuery"
              class="topbar-search"
              placeholder="Search pages, switches, VLANs, IPs"
              aria-label="Global app search"
              role="combobox"
              :aria-expanded="isSearchOpen"
              :aria-controls="'global-search-results'"
              :aria-activedescendant="highlightedResultIndex >= 0 ? `search-result-${highlightedResultIndex}` : undefined"
              @focus="onSearchFocus"
              @blur="onSearchBlur"
              @keydown="onSearchKeydown"
            />

            <div v-if="isSearchOpen" id="global-search-results" class="search-dropdown panel" role="listbox">
              <p v-if="isSearchLoading" class="search-status">Indexing global search data…</p>
              <p v-else-if="searchError" class="search-status">Search index could not be loaded.</p>
              <p v-else-if="!hasSearchQuery" class="search-status">Type to search across pages and records.</p>
              <p v-else-if="!results.length" class="search-status">No results found.</p>

              <template v-else>
                <section v-for="group in groupedIndexedResults" :key="group.group" class="search-group">
                  <p class="search-group__title">{{ group.group }}</p>

                  <button
                    v-for="result in group.items"
                    :id="`search-result-${result.index}`"
                    :key="result.id"
                    type="button"
                    class="search-result"
                    :class="{ 'search-result--active': result.index === highlightedResultIndex }"
                    role="option"
                    :aria-selected="result.index === highlightedResultIndex"
                    @mousedown.prevent
                    @click="selectResult(result)"
                  >
                    <span class="search-result__title">{{ result.title }}</span>
                    <small class="search-result__description">{{ result.description }}</small>
                  </button>
                </section>
              </template>
            </div>
          </div>
          <button type="button" class="button button--ghost" @click="handleRefreshClick">Refresh</button>
          <ThemeToggle />
        </div>
      </header>

      <main class="content-main">
        <NuxtPage />
      </main>

      <footer class="app-footer">
        <div class="app-footer__brand">
          <strong>ezSWM</strong>
          <small>Open-source network documentation</small>
        </div>
        <a href="https://github.com/slgfire/website-saarlan-eccm" target="_blank" rel="noopener noreferrer">GitHub</a>
      </footer>
    </div>
  </div>
</template>
