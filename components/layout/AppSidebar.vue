<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const groups = computed(() => [
  {
    label: t('nav.operations'),
    items: [{ label: t('nav.dashboard'), to: '/', icon: 'i-lucide-layout-dashboard' }]
  },
  {
    label: t('nav.switching'),
    items: [{ label: t('nav.switches'), to: '/switches', icon: 'i-lucide-ethernet-port' }]
  },
  {
    label: t('nav.network'),
    items: [{ label: t('nav.networks'), to: '/networks', icon: 'i-lucide-workflow' }]
  },
  {
    label: t('nav.system'),
    items: [{ label: t('nav.settings'), to: '/settings', icon: 'i-lucide-settings-2' }]
  }
])

const isActive = (to: string) => {
  return to === '/' ? route.path === to : route.path.startsWith(to)
}
</script>

<template>
  <nav class="space-y-5">
    <div
      v-for="group in groups"
      :key="group.label"
      class="space-y-2"
    >
      <p class="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {{ group.label }}
      </p>

      <div class="space-y-1">
        <UButton
          v-for="item in group.items"
          :key="item.to"
          :label="item.label"
          :to="item.to"
          :icon="item.icon"
          :variant="isActive(item.to) ? 'soft' : 'ghost'"
          :color="isActive(item.to) ? 'primary' : 'neutral'"
          class="w-full justify-start rounded-lg px-3 py-2.5"
          :ui="{
            leadingIcon: 'size-4',
            trailingIcon: 'size-4'
          }"
          trailing-icon="i-lucide-chevron-right"
        />
      </div>
    </div>
  </nav>
</template>
