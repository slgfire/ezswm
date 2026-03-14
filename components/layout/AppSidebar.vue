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
  <nav class="space-y-6">
    <section v-for="group in groups" :key="group.label" class="space-y-2.5">
      <p class="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-toned">
        {{ group.label }}
      </p>

      <div class="space-y-1">
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition"
          :class="isActive(item.to)
            ? 'border-primary/40 bg-primary/15 text-primary shadow-sm shadow-primary/10'
            : 'border-transparent text-muted hover:border-default/80 hover:bg-default/50 hover:text-highlighted'"
        >
          <UIcon :name="item.icon" class="size-4 shrink-0" />
          <span class="flex-1 font-medium">{{ item.label }}</span>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 opacity-45 transition group-hover:translate-x-0.5 group-hover:opacity-80"
          />
        </NuxtLink>
      </div>
    </section>
  </nav>
</template>
