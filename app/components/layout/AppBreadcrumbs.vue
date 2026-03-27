<template>
  <nav v-if="crumbs.length > 1" class="border-b border-default px-4 py-2">
    <ol class="flex items-center gap-1 text-sm">
      <li v-for="(crumb, i) in crumbs" :key="crumb.path" class="flex items-center gap-1">
        <UIcon v-if="i > 0" name="i-heroicons-chevron-right-20-solid" class="h-4 w-4 text-neutral-500" />
        <NuxtLink
          v-if="i < crumbs.length - 1"
          :to="crumb.path"
          class="text-neutral-400 hover:text-gray-900 dark:hover:text-white"
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
const { currentSite } = useCurrentSite()

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
  'sites': 'nav.sites',
  'create': 'common.create',
  'edit': 'common.edit'
}

const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))

const crumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const siteId = route.params.siteId as string
  const result: { path: string; label: string }[] = []

  // If we're in a site-scoped route (/sites/:siteId/...)
  if (parts[0] === 'sites' && siteId) {
    // Dashboard link goes to the site dashboard
    const siteBase = `/sites/${siteId}`
    result.push({ path: siteBase, label: currentSite.value?.name || t('nav.dashboard') })

    // Add remaining parts after /sites/:siteId/
    const remainingParts = parts.slice(2) // skip 'sites' and siteId
    let currentPath = siteBase
    for (const part of remainingParts) {
      currentPath += `/${part}`
      const key = labelMap[part]
      const override = breadcrumbOverrides.value[currentPath]
      result.push({
        path: currentPath,
        label: override || (key ? t(key) : part)
      })
    }
  } else if (parts[0] === 'sites' && !siteId) {
    // /sites list page
    result.push({ path: '/sites', label: t('nav.sites') })
    const remainingParts = parts.slice(1)
    let currentPath = '/sites'
    for (const part of remainingParts) {
      currentPath += `/${part}`
      const key = labelMap[part]
      result.push({
        path: currentPath,
        label: key ? t(key) : part
      })
    }
  } else {
    // Global routes (settings, layout-templates, etc.)
    result.push({ path: '/', label: t('nav.dashboard') })
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
  }

  return result
})
</script>
