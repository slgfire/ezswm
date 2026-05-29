<template>
  <nav v-if="crumbs.length > 1" class="border-b border-default px-4 py-2">
    <ol class="flex items-center gap-1 text-sm">
      <li v-for="(crumb, i) in crumbs" :key="crumb.path" class="flex items-center gap-1">
        <UIcon v-if="i > 0" name="i-heroicons-chevron-right-20-solid" class="h-4 w-4 text-neutral-500" />
        <NuxtLink
          v-if="i < crumbs.length - 1"
          :to="crumb.path"
          class="flex items-center gap-1.5 text-neutral-400 hover:text-gray-900 dark:hover:text-white"
        >
          <UIcon v-if="crumb.icon" :name="crumb.icon" class="h-4 w-4 flex-shrink-0" />
          {{ crumb.label }}
        </NuxtLink>
        <span v-else class="flex items-center gap-1.5 text-gray-900 dark:text-white">
          <UIcon v-if="crumb.icon" :name="crumb.icon" class="h-4 w-4 flex-shrink-0" />
          {{ crumb.label }}
        </span>
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
  'ip-addresses': 'nav.ipAddresses',
  'topology': 'nav.topology',
  'tools': 'nav.tools',
  'subnet-calculator': 'nav.subnetCalculator',
  'layout-templates': 'nav.layoutTemplates',
  'data-management': 'nav.dataManagement',
  'settings': 'nav.settings',
  'sites': 'nav.sites',
  'create': 'common.create',
  'edit': 'common.edit'
}

const iconMap: Record<string, string> = {
  'switches': 'i-heroicons-server-stack',
  'vlans': 'i-heroicons-tag',
  'networks': 'i-heroicons-globe-alt',
  'ip-addresses': 'i-heroicons-map-pin',
  'topology': 'i-heroicons-share',
  'subnet-calculator': 'i-heroicons-calculator',
  'layout-templates': 'i-heroicons-rectangle-group',
  'data-management': 'i-heroicons-circle-stack',
  'settings': 'i-heroicons-cog-6-tooth',
  'sites': 'i-heroicons-building-office-2',
  'create': 'i-heroicons-plus',
  'edit': 'i-heroicons-pencil-square'
}

const DASHBOARD_ICON = 'i-heroicons-home'

const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))

const crumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const siteId = route.params.siteId as string
  const result: { path: string; label: string; icon?: string }[] = []

  // If we're in a site-scoped route (/sites/:siteId/...)
  if (parts[0] === 'sites' && siteId) {
    // Dashboard link goes to the site dashboard
    const siteBase = `/sites/${siteId}`
    result.push({ path: siteBase, label: t('nav.dashboard'), icon: DASHBOARD_ICON })

    // Add remaining parts after /sites/:siteId/
    const remainingParts = parts.slice(2) // skip 'sites' and siteId
    let currentPath = siteBase
    for (const part of remainingParts) {
      currentPath += `/${part}`
      const key = labelMap[part]
      const override = breadcrumbOverrides.value[currentPath]
      result.push({
        path: currentPath,
        label: override || (key ? t(key) : part),
        icon: iconMap[part]
      })
    }
  } else if (parts[0] === 'sites' && !siteId) {
    // /sites list page
    result.push({ path: '/sites', label: t('nav.sites'), icon: iconMap['sites'] })
    const remainingParts = parts.slice(1)
    let currentPath = '/sites'
    for (const part of remainingParts) {
      currentPath += `/${part}`
      const key = labelMap[part]
      result.push({
        path: currentPath,
        label: key ? t(key) : part,
        icon: iconMap[part]
      })
    }
  } else {
    // Global routes (settings, layout-templates, etc.)
    result.push({ path: '/', label: t('nav.dashboard'), icon: DASHBOARD_ICON })
    let currentPath = ''
    for (const part of parts) {
      currentPath += `/${part}`
      const key = labelMap[part]
      const override = breadcrumbOverrides.value[currentPath]
      result.push({
        path: currentPath,
        label: override || (key ? t(key) : part),
        icon: iconMap[part]
      })
    }
  }

  return result
})
</script>
