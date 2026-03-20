<template>
  <header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
    <div class="flex items-center gap-4">
      <!-- Mobile menu toggle -->
      <UButton
        class="lg:hidden"
        variant="ghost"
        color="gray"
        icon="i-heroicons-bars-3"
        @click="$emit('toggleSidebar')"
      />

      <!-- Search -->
      <div class="relative hidden sm:block">
        <UInput
          v-model="searchQuery"
          :placeholder="$t('common.search')"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-72"
          autocomplete="off"
          @focus="showResults = true"
          @keydown.escape="showResults = false"
        />

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
                v-for="sw in results.switches"
                :key="sw.id"
                :to="`/switches/${sw.id}`"
                class="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                @click="closeSearch"
              >
                <UIcon name="i-heroicons-server-stack" class="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-gray-900 dark:text-white">{{ sw.name }}</div>
                  <div v-if="sw.management_ip" class="truncate font-mono text-xs text-gray-400">{{ sw.management_ip }}</div>
                </div>
              </NuxtLink>
            </template>

            <!-- VLANs -->
            <template v-if="results.vlans?.length">
              <div class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400">{{ $t('search.vlans') }}</div>
              <NuxtLink
                v-for="vlan in results.vlans"
                :key="vlan.id"
                :to="`/vlans/${vlan.id}`"
                class="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                @click="closeSearch"
              >
                <div class="h-3 w-3 flex-shrink-0 rounded" :style="{ backgroundColor: vlan.color }" />
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-gray-900 dark:text-white">VLAN {{ vlan.vlan_id }} — {{ vlan.name }}</div>
                </div>
              </NuxtLink>
            </template>

            <!-- Networks -->
            <template v-if="results.networks?.length">
              <div class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400">{{ $t('search.networks') }}</div>
              <NuxtLink
                v-for="net in results.networks"
                :key="net.id"
                :to="`/networks/${net.id}`"
                class="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                @click="closeSearch"
              >
                <UIcon name="i-heroicons-globe-alt" class="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-gray-900 dark:text-white">{{ net.name }}</div>
                  <div class="font-mono text-xs text-gray-400">{{ net.subnet }}</div>
                </div>
              </NuxtLink>
            </template>

            <!-- Allocations -->
            <template v-if="results.allocations?.length">
              <div class="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400">{{ $t('search.ipAllocations') }}</div>
              <div
                v-for="alloc in results.allocations"
                :key="alloc.id"
                class="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <UIcon name="i-heroicons-map-pin" class="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div class="min-w-0 flex-1">
                  <div class="font-mono font-medium text-gray-900 dark:text-white">{{ alloc.ip_address }}</div>
                  <div v-if="alloc.hostname" class="text-xs text-gray-400">{{ alloc.hostname }}</div>
                </div>
              </div>
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
        color="gray"
        :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
        @click="toggleColorMode"
      />

      <!-- User menu -->
      <UDropdown :items="userMenuItems" :popper="{ placement: 'bottom-end' }">
        <UButton variant="ghost" color="gray" class="gap-2">
          <UIcon name="i-heroicons-user-circle" class="h-5 w-5" />
          <span class="hidden sm:inline text-sm">{{ user?.display_name }}</span>
        </UButton>
      </UDropdown>
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
const results = ref<any>({ switches: [], vlans: [], networks: [], allocations: [] })

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!q || q.length < 2) {
    results.value = { switches: [], vlans: [], networks: [], allocations: [] }
    return
  }
  searching.value = true
  debounceTimer = setTimeout(async () => {
    try {
      results.value = await $fetch('/api/search', { params: { q } })
    } catch {
      results.value = { switches: [], vlans: [], networks: [], allocations: [] }
    } finally {
      searching.value = false
    }
  }, 250)
})

const hasResults = computed(() =>
  results.value.switches?.length ||
  results.value.vlans?.length ||
  results.value.networks?.length ||
  results.value.allocations?.length
)

function closeSearch() {
  showResults.value = false
  searchQuery.value = ''
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
