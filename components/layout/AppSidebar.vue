<script setup lang="ts">
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
</script>

<template>
  <div class="space-y-4">
    <div v-for="group in groups" :key="group.label" class="space-y-1">
      <p class="text-xs font-semibold uppercase text-muted">{{ group.label }}</p>
      <UButton
        v-for="item in group.items"
        :key="item.to"
        :label="item.label"
        :to="item.to"
        variant="ghost"
        class="w-full justify-start"
      />
    </div>
  </div>
</template>
