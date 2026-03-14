<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const groups = computed(() => [
  {
    label: t('nav.operations'),
    items: [{ label: t('nav.dashboard'), to: '/' }]
  },
  {
    label: t('nav.switching'),
    items: [{ label: t('nav.switches'), to: '/switches' }]
  },
  {
    label: t('nav.network'),
    items: [{ label: t('nav.networks'), to: '/networks' }]
  },
  {
    label: t('nav.system'),
    items: [{ label: t('nav.settings'), to: '/settings' }]
  }
])

const isActive = (to: string) => {
  return to === '/' ? route.path === to : route.path.startsWith(to)
}
</script>

<template>
  <nav class="space-y-6">
    <div v-for="group in groups" :key="group.label" class="space-y-2">
      <p class="px-2 text-xs font-semibold uppercase tracking-wide text-muted">{{ group.label }}</p>

      <div class="space-y-1">
        <UButton
          v-for="item in group.items"
          :key="item.to"
          :label="item.label"
          :to="item.to"
          :variant="isActive(item.to) ? 'soft' : 'ghost'"
          :color="isActive(item.to) ? 'primary' : 'neutral'"
          class="w-full justify-start"
          icon="i-lucide-chevron-right"
        />
      </div>
    </div>
  </nav>
</template>
