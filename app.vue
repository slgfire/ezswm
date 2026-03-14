<script setup lang="ts">
import type { GlobalSearchResult } from '~/composables/useGlobalSearch'

const route = useRoute()

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Network operations overview' },
  '/switches': { title: 'Switches', subtitle: 'Switch inventory and lifecycle' },
  '/networks': { title: 'Networks & IPAM', subtitle: 'Subnets, ranges, and allocations' },
  '/settings': { title: 'Settings', subtitle: 'System configuration and defaults' }
}

const navigationGroups = [
  {
    title: 'Operations',
    items: [{ label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' }]
  },
  {
    title: 'Switching',
    items: [{ label: 'Switches', to: '/switches', icon: 'i-lucide-server' }]
  },
  {
    title: 'Network',
    items: [{ label: 'Networks', to: '/networks', icon: 'i-lucide-network' }]
  },
  {
    title: 'System',
    items: [{ label: 'Settings', to: '/settings', icon: 'i-lucide-settings' }]
  }
]

const headerMeta = computed(() => {
  const match = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => route.path === prefix || route.path.startsWith(`${prefix}/`))

  return match?.[1] || { title: 'ezSWM', subtitle: 'Switch and IP management' }
})

const searchQuery = ref('')
const highlightedResultIndex = ref(-1)
const isSearchOpen = ref(false)

const { results, pending: isSearchLoading, error: searchError, refresh: refreshSearch } = useGlobalSearch(searchQuery)

const handleRefreshClick = async () => {
  await refreshSearch()
}

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

const searchOpen = computed({
  get: () => isSearchOpen.value,
  set: (value: boolean) => {
    isSearchOpen.value = value
    if (!value) highlightedResultIndex.value = -1
  }
})

const selectResult = async (result: GlobalSearchResult) => {
  searchQuery.value = ''
  searchOpen.value = false
  await navigateTo(result.to)
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

const onSearchKeydown = async (event: KeyboardEvent) => {
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
    searchOpen.value = false
  }
}
</script>

<template>
  <UApp>
    <div class="app-shell">
      <aside class="sidebar">
        <UCard class="sidebar-brand">
          <p class="sidebar-brand__title">ezSWM</p>
          <small>Easy Switch and IP Management</small>
        </UCard>

        <div class="sidebar-nav">
          <section v-for="group in navigationGroups" :key="group.title" class="nav-group">
            <p class="nav-group__title">{{ group.title }}</p>
            <UButton
              v-for="item in group.items"
              :key="item.label"
              :to="item.to"
              :label="item.label"
              :icon="item.icon"
              variant="ghost"
              color="neutral"
              class="nav-link"
              :class="{ 'nav-link--active': route.path === item.to || route.path.startsWith(`${item.to}/`) }"
              block
            />
          </section>
        </div>
      </aside>

      <div class="content-wrap">
        <UCard class="topbar">
          <div>
            <h2 class="topbar-title">{{ headerMeta.title }}</h2>
            <small>{{ headerMeta.subtitle }}</small>
          </div>
          <div class="row topbar-actions">
            <UPopover v-model:open="searchOpen">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Search pages, switches, VLANs, IPs"
                class="topbar-search"
                @focus="searchOpen = true"
                @keydown="onSearchKeydown"
              />
              <template #content>
                <div class="search-dropdown">
                  <p v-if="isSearchLoading" class="search-status">Indexing global search data…</p>
                  <p v-else-if="searchError" class="search-status">Search index could not be loaded.</p>
                  <p v-else-if="!hasSearchQuery" class="search-status">Type to search across pages and records.</p>
                  <p v-else-if="!results.length" class="search-status">No results found.</p>
                  <template v-else>
                    <section v-for="group in groupedIndexedResults" :key="group.group" class="search-group">
                      <p class="search-group__title">{{ group.group }}</p>
                      <UButton
                        v-for="result in group.items"
                        :key="result.id"
                        variant="ghost"
                        color="neutral"
                        block
                        class="search-result"
                        :class="{ 'search-result--active': result.index === highlightedResultIndex }"
                        @click="selectResult(result)"
                      >
                        <div class="search-result__title">{{ result.title }}</div>
                        <small class="search-result__description">{{ result.description }}</small>
                      </UButton>
                    </section>
                  </template>
                </div>
              </template>
            </UPopover>
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-refresh-cw"
              label="Refresh"
              @click="handleRefreshClick"
            />
            <ThemeToggle />
          </div>
        </UCard>

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
  </UApp>
</template>
