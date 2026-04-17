<template>
  <aside
    class="flex h-full flex-col border-r border-default bg-default"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center border-b border-default px-4">
      <NuxtLink :to="sitePrefix" class="font-display text-xl font-bold">
        <span class="text-primary-500">ez</span><span v-if="!collapsed" class="tracking-tight text-gray-900 dark:text-white">SWM</span>
      </NuxtLink>
    </div>

    <!-- Site Switcher -->
    <LayoutSiteSwitcher v-if="!collapsed" />

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-2 py-4">
      <ul class="space-y-1">
        <template v-for="(section, sectionIdx) in navSections" :key="sectionIdx">
          <li v-if="section.divider" class="my-3 border-t border-default" />
          <li v-for="item in section.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              :class="isActive(item.to)
                ? 'sidebar-active bg-primary-500/10 text-primary-500 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'"
            >
              <UIcon :name="item.icon" class="h-5 w-5 flex-shrink-0" />
              <span v-if="!collapsed">{{ $t(item.label) }}</span>
            </NuxtLink>
          </li>
        </template>
      </ul>
    </nav>

    <!-- Footer info + collapse toggle -->
    <div class="flex items-center border-t border-default p-2" :class="collapsed ? 'justify-center' : 'justify-between'">
      <div v-if="!collapsed" class="flex items-center gap-2.5 px-1 font-mono text-sm text-neutral-500">
        <span>v{{ version }}</span>
        <a href="https://github.com/slgfire/ezswm" target="_blank" rel="noopener" class="text-neutral-400 hover:text-primary-500 transition-colors">
          <UIcon name="i-simple-icons-github" class="h-4.5 w-4.5" />
        </a>
      </div>
      <UButton
        variant="ghost"
        color="neutral"
        :icon="collapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'"
        size="xs"
        @click="$emit('toggle')"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()

const config = useRuntimeConfig()
const version = config.public.appVersion

const route = useRoute()
const { currentSiteId } = useCurrentSite()

const sitePrefix = computed(() => `/sites/${currentSiteId.value}`)

const navSections = computed(() => [
  {
    items: [
      { to: sitePrefix.value, icon: 'i-heroicons-home', label: 'nav.dashboard' }
    ]
  },
  {
    divider: true,
    items: [
      { to: `${sitePrefix.value}/switches`, icon: 'i-heroicons-server-stack', label: 'nav.switches' },
      { to: `${sitePrefix.value}/vlans`, icon: 'i-heroicons-tag', label: 'nav.vlans' },
      { to: `${sitePrefix.value}/networks`, icon: 'i-heroicons-globe-alt', label: 'nav.networks' }
    ]
  },
  {
    divider: true,
    items: [
      { to: '/topology', icon: 'i-heroicons-share', label: 'nav.topology' },
      { to: '/tools/subnet-calculator', icon: 'i-heroicons-calculator', label: 'nav.subnetCalculator' }
    ]
  },
  {
    divider: true,
    items: [
      { to: '/layout-templates', icon: 'i-heroicons-rectangle-group', label: 'nav.layoutTemplates' },
      { to: '/data-management', icon: 'i-heroicons-circle-stack', label: 'nav.dataManagement' }
    ]
  },
  {
    divider: true,
    items: [
      { to: '/sites', icon: 'i-heroicons-building-office-2', label: 'nav.sites' },
      { to: '/settings', icon: 'i-heroicons-cog-6-tooth', label: 'nav.settings' }
    ]
  }
])

function isActive(path: string): boolean {
  // Exact match for Sites management page
  if (path === '/sites') {
    return route.path === '/sites' || route.path === '/sites/'
  }
  // Site-scoped paths
  if (path.startsWith('/sites/')) {
    // Dashboard (/sites/:id) — exact match only
    const isDashboard = path.match(/^\/sites\/[^/]+$/)
    if (isDashboard) {
      return route.path === path || route.path === path + '/'
    }
    return route.path.startsWith(path)
  }
  // Global paths
  return route.path === path || route.path.startsWith(path + '/')
}
</script>
