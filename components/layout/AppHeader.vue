<script setup lang="ts">
const emit = defineEmits<{ (e: 'toggle-sidebar'): void }>()

const query = ref('')
const open = ref(false)
const { locale, locales, setLocale, t } = useI18n()

const { data: results, refresh } = await useFetch('/api/search', {
  query: computed(() => ({ q: query.value })),
  immediate: false,
  watch: false
})

watchDebounced(query, async (value) => {
  if (!value) {
    open.value = false
    return
  }

  await refresh()
  open.value = true
}, { debounce: 250, maxWait: 500 })

const go = async (to: string) => {
  open.value = false
  query.value = ''
  await navigateTo(to)
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-default/70 bg-[var(--ui-bg)]/90 backdrop-blur-xl">
    <div class="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <UButton
        icon="i-lucide-panel-left"
        variant="ghost"
        color="neutral"
        size="sm"
        class="lg:hidden"
        @click="emit('toggle-sidebar')"
      />

      <div class="hidden lg:flex lg:flex-col">
        <span class="text-[11px] font-medium uppercase tracking-[0.12em] text-toned">ezSWM</span>
        <span class="text-sm font-semibold text-highlighted">Dashboard</span>
      </div>

      <div class="relative min-w-0 flex-1 lg:max-w-xl">
        <UInput
          v-model="query"
          :placeholder="t('search.placeholder')"
          icon="i-lucide-search"
          size="md"
          class="w-full"
          :ui="{ base: 'bg-default/40 ring-default/80' }"
        />

        <UCard
          v-if="open"
          class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 border border-default/90 bg-[var(--ui-bg-elevated)]"
        >
          <div class="space-y-1">
            <UButton
              v-for="result in results || []"
              :key="result.id"
              variant="ghost"
              color="neutral"
              class="w-full justify-between"
              @click="go(result.to)"
            >
              <span>{{ result.title }}</span>
              <UBadge color="neutral" variant="subtle">{{ result.type }}</UBadge>
            </UButton>
          </div>
        </UCard>
      </div>

      <div class="flex items-center gap-1 sm:gap-2">
        <UButton icon="i-lucide-bell" variant="ghost" color="neutral" />
        <UButton icon="i-lucide-circle-help" variant="ghost" color="neutral" class="hidden sm:inline-flex" />

        <USelect
          :model-value="locale"
          :items="locales"
          value-key="code"
          label-key="name"
          class="w-28"
          @update:model-value="setLocale($event as string)"
        />

        <UColorModeButton />
      </div>
    </div>
  </header>
</template>
