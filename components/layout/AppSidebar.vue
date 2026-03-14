<script setup lang="ts">
const { t } = useI18n()

const items = computed(() => [
  {
    label: t('nav.operations'),
    children: [{ label: t('nav.dashboard'), to: '/dashboard', icon: 'i-lucide-layout-dashboard' }]
  },
  {
    label: t('nav.switching'),
    children: [{ label: t('nav.switches'), to: '/switches', icon: 'i-lucide-network' }]
  },
  {
    label: t('nav.network'),
    children: [{ label: t('nav.networks'), to: '/networks', icon: 'i-lucide-globe' }]
  },
  {
    label: t('nav.system'),
    children: [{ label: t('nav.settings'), to: '/settings', icon: 'i-lucide-settings' }]
  }
])
</script>

<template>
  <UCard class="h-full">
    <template #header>
      <div class="font-semibold text-lg">ezSWM</div>
      <p class="text-sm text-muted">Easy Switch and IP Management</p>
    </template>

    <UNavigationMenu orientation="vertical" :items="items" />
  </UCard>
</template>
