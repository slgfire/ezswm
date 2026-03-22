<template>
  <aside
    class="flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-dark"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center border-b border-gray-200 px-4 dark:border-gray-800">
      <NuxtLink to="/" class="flex items-center gap-1.5 font-display">
        <span class="text-xl font-bold text-primary-500">ez</span>
        <span v-if="!collapsed" class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">SWM</span>
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-2 py-4">
      <ul class="space-y-1">
        <template v-for="section in navSections" :key="section.label">
          <li v-if="section.divider" class="my-3 border-t border-gray-200 dark:border-gray-800" />
          <li v-for="item in section.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              :class="isActive(item.to)
                ? 'sidebar-active bg-primary-500/10 text-primary-500 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-200 dark:hover:text-white'"
            >
              <UIcon :name="item.icon" class="h-5 w-5 flex-shrink-0" />
              <span v-if="!collapsed">{{ $t(item.label) }}</span>
            </NuxtLink>
          </li>
        </template>
      </ul>
    </nav>

    <!-- Collapse toggle -->
    <div class="border-t border-gray-200 p-2 dark:border-gray-800">
      <UButton
        variant="ghost"
        color="gray"
        :icon="collapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'"
        size="sm"
        block
        @click="$emit('toggle')"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()

const route = useRoute()

const navSections = [
  {
    items: [
      { to: '/', icon: 'i-heroicons-home', label: 'nav.dashboard' }
    ]
  },
  {
    divider: true,
    items: [
      { to: '/switches', icon: 'i-heroicons-server-stack', label: 'nav.switches' },
      { to: '/vlans', icon: 'i-heroicons-tag', label: 'nav.vlans' },
      { to: '/networks', icon: 'i-heroicons-globe-alt', label: 'nav.networks' }
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
      { to: '/settings', icon: 'i-heroicons-cog-6-tooth', label: 'nav.settings' }
    ]
  }
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
