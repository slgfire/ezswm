<template>
  <nav v-if="crumbs.length > 1" class="border-b border-gray-200 px-4 py-2 dark:border-gray-800">
    <ol class="flex items-center gap-1 text-sm">
      <li v-for="(crumb, i) in crumbs" :key="crumb.path" class="flex items-center gap-1">
        <UIcon v-if="i > 0" name="i-heroicons-chevron-right-20-solid" class="h-4 w-4 text-gray-500" />
        <NuxtLink
          v-if="i < crumbs.length - 1"
          :to="crumb.path"
          class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          {{ crumb.label }}
        </NuxtLink>
        <span v-else class="text-gray-900 dark:text-white">{{ crumb.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const labelMap: Record<string, string> = {
  '': 'nav.dashboard',
  'switches': 'nav.switches',
  'vlans': 'nav.vlans',
  'networks': 'nav.networks',
  'topology': 'nav.topology',
  'tools': 'nav.tools',
  'subnet-calculator': 'nav.subnetCalculator',
  'layout-templates': 'nav.layoutTemplates',
  'data-management': 'nav.dataManagement',
  'settings': 'nav.settings',
  'create': 'common.create',
  'edit': 'common.edit'
}

const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))

const crumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const result = [{ path: '/', label: t('nav.dashboard') }]

  let currentPath = ''
  for (const part of parts) {
    currentPath += `/${part}`
    const key = labelMap[part]
    const override = breadcrumbOverrides.value[currentPath]
    result.push({
      path: currentPath,
      label: override || (key ? t(key) : part)
    })
  }

  return result
})
</script>
