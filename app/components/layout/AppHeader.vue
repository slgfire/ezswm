<template>
  <header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-dark">
    <div class="flex items-center gap-4">
      <!-- Mobile menu toggle -->
      <UButton
        class="lg:hidden"
        variant="ghost"
        color="neutral"
        icon="i-heroicons-bars-3"
        @click="$emit('toggleSidebar')"
      />

      <!-- Search -->
      <div class="relative hidden sm:block">
        <div class="flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 dark:border-gray-700 dark:bg-dark-100">
          <span class="font-mono text-xs font-semibold text-primary-500 select-none">&gt;_</span>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            :placeholder="$t('common.search')"
            class="w-64 border-0 bg-transparent py-1.5 pl-2 font-mono text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-white dark:placeholder-gray-500"
            autocomplete="off"
            @focus="showResults = true"
            @keydown.escape="showResults = false"
            @keydown.down.prevent="moveSelection(1)"
            @keydown.up.prevent="moveSelection(-1)"
            @keydown.enter.prevent="navigateToSelected"
          />
        </div>

        <!-- Search results dropdown -->
        <div
          v-if="showResults && searchQuery.length >= 2"
          class="absolute left-0 top-full z-50 mt-1 w-96 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <div v-if="searching" class="flex items-center justify-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin text-gray-400" />
          </div>

          <div v-else-if="hasResults" class="max-h-96 overflow-y-auto py-1">
            <!-- Switches -->
            <template v-if="results.switches?.length">
              <div class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400">{{ $t('search.switches') }}</div>
              <NuxtLink
                v-for="(sw, i) in results.switches"
                :key="sw.id"
                :to="`/switches/${sw.id}`"
                :class="['flex items-center gap-3 px-3 py-2 text-sm transition-colors', flatIndex('switches', i) === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800']"
                @click="closeSearch"
                @mouseenter="selectedIndex = flatIndex('switches', i)"
              >
                <UIcon name="i-heroicons-server-stack" class="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="font-medium text-gray-900 dark:text-white" v-html="highlight(sw.name)" />
                    <span v-if="sw.role" class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ sw.role }}</span>
                  </div>
                  <div class="flex items-center gap-2 truncate text-xs text-gray-400">
                    <span v-if="sw.manufacturer || sw.model" v-html="highlight([sw.manufacturer, sw.model].filter(Boolean).join(' '))" />
                    <span v-if="sw.management_ip" class="font-mono" v-html="highlight(sw.management_ip)" />
                    <span v-if="sw.tags?.length" class="truncate">{{ sw.tags.join(', ') }}</span>
                  </div>
                </div>
              </NuxtLink>
            </template>

            <!-- VLANs -->
            <template v-if="results.vlans?.length">
              <div class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400">{{ $t('search.vlans') }}</div>
              <NuxtLink
                v-for="(vlan, i) in results.vlans"
                :key="vlan.id"
                :to="`/vlans/${vlan.id}`"
                :class="['flex items-center gap-3 px-3 py-2 text-sm transition-colors', flatIndex('vlans', i) === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800']"
                @click="closeSearch"
                @mouseenter="selectedIndex = flatIndex('vlans', i)"
              >
                <div class="h-3 w-3 flex-shrink-0 rounded" :style="{ backgroundColor: vlan.color }" />
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-gray-900 dark:text-white"><span v-html="highlight(`VLAN ${vlan.vlan_id} — ${vlan.name}`)" /></div>
                </div>
              </NuxtLink>
            </template>

            <!-- Networks -->
            <template v-if="results.networks?.length">
              <div class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400">{{ $t('search.networks') }}</div>
              <NuxtLink
                v-for="(net, i) in results.networks"
                :key="net.id"
                :to="`/networks/${net.id}`"
                :class="['flex items-center gap-3 px-3 py-2 text-sm transition-colors', flatIndex('networks', i) === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800']"
                @click="closeSearch"
                @mouseenter="selectedIndex = flatIndex('networks', i)"
              >
                <UIcon name="i-heroicons-globe-alt" class="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-gray-900 dark:text-white" v-html="highlight(net.name)" />
                  <div class="font-mono text-xs text-gray-400" v-html="highlight(net.subnet)" />
                </div>
              </NuxtLink>
            </template>

            <!-- Allocations -->
            <template v-if="results.allocations?.length">
              <div class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400">{{ $t('search.ipAllocations') }}</div>
              <NuxtLink
                v-for="(alloc, i) in results.allocations"
                :key="alloc.id"
                :to="allocLink(alloc)"
                :class="['flex items-center gap-3 px-3 py-2 text-sm transition-colors', flatIndex('allocations', i) === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800']"
                @click="closeSearch"
                @mouseenter="selectedIndex = flatIndex('allocations', i)"
              >
                <UIcon name="i-heroicons-map-pin" class="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div class="min-w-0 flex-1">
                  <div class="font-mono font-medium text-gray-900 dark:text-white" v-html="highlight(alloc.ip_address)" />
                  <div v-if="alloc.hostname" class="text-xs text-gray-400" v-html="highlight(alloc.hostname)" />
                </div>
              </NuxtLink>
            </template>

            <!-- Templates -->
            <template v-if="results.templates?.length">
              <div class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400">{{ $t('search.templates') }}</div>
              <NuxtLink
                v-for="(tpl, i) in results.templates"
                :key="tpl.id"
                :to="`/layout-templates/${tpl.id}`"
                :class="['flex items-center gap-3 px-3 py-2 text-sm transition-colors', flatIndex('templates', i) === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800']"
                @click="closeSearch"
                @mouseenter="selectedIndex = flatIndex('templates', i)"
              >
                <UIcon name="i-heroicons-rectangle-group" class="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-gray-900 dark:text-white" v-html="highlight(tpl.name)" />
                  <div v-if="tpl.manufacturer || tpl.model" class="text-xs text-gray-400" v-html="highlight([tpl.manufacturer, tpl.model].filter(Boolean).join(' · '))" />
                </div>
              </NuxtLink>
            </template>
          </div>

          <div v-else class="py-4 text-center text-sm text-gray-400">
            {{ $t('search.noResults') }}
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <!-- Theme toggle -->
      <UButton
        variant="ghost"
        color="neutral"
        :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
        @click="toggleColorMode"
      />

      <!-- User menu -->
      <UDropdownMenu :items="userMenuItems" :popper="{ placement: 'bottom-end' }">
        <UButton variant="ghost" color="neutral" class="gap-2">
          <UIcon name="i-heroicons-user-circle" class="h-5 w-5" />
          <span class="hidden sm:inline text-sm">{{ user?.display_name }}</span>
        </UButton>
      </UDropdownMenu>
    </div>
  </header>

  <!-- Click outside to close -->
  <div v-if="showResults && searchQuery.length >= 2" class="fixed inset-0 z-40" @click="showResults = false" />
</template>

<script setup lang="ts">
defineEmits<{ toggleSidebar: [] }>()

const { user, logout } = useAuth()
const router = useRouter()
const colorMode = useColorMode()
const { t } = useI18n()

const isDark = computed(() => colorMode.value === 'dark')

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Search
const searchQuery = ref('')
const showResults = ref(false)
const searching = ref(false)
const selectedIndex = ref(-1)
const searchInputRef = ref<any>(null)
const results = ref<any>({ switches: [], vlans: [], networks: [], allocations: [], templates: [] })

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  selectedIndex.value = -1
  if (!q || q.length < 2) {
    results.value = { switches: [], vlans: [], networks: [], allocations: [], templates: [] }
    return
  }
  searching.value = true
  debounceTimer = setTimeout(async () => {
    try {
      results.value = await $fetch('/api/search', { params: { q } })
    } catch {
      results.value = { switches: [], vlans: [], networks: [], allocations: [], templates: [] }
    } finally {
      searching.value = false
    }
  }, 250)
})

const hasResults = computed(() =>
  results.value.switches?.length ||
  results.value.vlans?.length ||
  results.value.networks?.length ||
  results.value.allocations?.length ||
  results.value.templates?.length
)

// Flat list of all results for keyboard navigation
const flatResults = computed(() => {
  const items: { type: string; index: number; url: string }[] = []
  for (const sw of results.value.switches || []) {
    items.push({ type: 'switches', index: items.length, url: `/switches/${sw.id}` })
  }
  for (const v of results.value.vlans || []) {
    items.push({ type: 'vlans', index: items.length, url: `/vlans/${v.id}` })
  }
  for (const n of results.value.networks || []) {
    items.push({ type: 'networks', index: items.length, url: `/networks/${n.id}` })
  }
  for (const a of results.value.allocations || []) {
    items.push({ type: 'allocations', index: items.length, url: `/networks/${a.network_id}` })
  }
  for (const tpl of results.value.templates || []) {
    items.push({ type: 'templates', index: items.length, url: `/layout-templates/${tpl.id}` })
  }
  return items
})

function flatIndex(type: string, i: number): number {
  let offset = 0
  const order = ['switches', 'vlans', 'networks', 'allocations', 'templates']
  for (const t of order) {
    if (t === type) return offset + i
    offset += (results.value[t]?.length || 0)
  }
  return -1
}

function moveSelection(dir: number) {
  showResults.value = true
  const total = flatResults.value.length
  if (total === 0) return
  selectedIndex.value = (selectedIndex.value + dir + total) % total
}

function navigateToSelected() {
  if (selectedIndex.value >= 0 && selectedIndex.value < flatResults.value.length) {
    const item = flatResults.value[selectedIndex.value]
    closeSearch()
    router.push(item.url)
  }
}

function allocLink(alloc: any): string {
  return alloc.network_id ? `/networks/${alloc.network_id}` : '#'
}

function highlight(text: string | undefined | null): string {
  if (!text || !searchQuery.value || searchQuery.value.length < 2) return escapeHtml(text || '')
  const escaped = escapeHtml(text)
  const q = escapeHtml(searchQuery.value)
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<mark class="bg-primary-200/50 text-inherit dark:bg-primary-700/40 rounded-sm px-0.5">$1</mark>')
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function closeSearch() {
  showResults.value = false
  searchQuery.value = ''
  selectedIndex.value = -1
}

const userMenuItems = computed(() => [
  [{
    label: t('nav.settings'),
    icon: 'i-heroicons-cog-6-tooth',
    click: () => router.push('/settings')
  }],
  [{
    label: t('auth.logout'),
    icon: 'i-heroicons-arrow-right-on-rectangle',
    click: async () => {
      await logout()
      await router.push('/login')
    }
  }]
])
</script>
