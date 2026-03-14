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
  <header class="sticky top-0 z-30 border-b border-default bg-default/95 backdrop-blur">
    <div class="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
      <UButton
        icon="i-lucide-menu"
        variant="ghost"
        size="sm"
        class="lg:hidden"
        @click="emit('toggle-sidebar')"
      />

      <div class="relative flex-1">
        <UInput v-model="query" :placeholder="t('search.placeholder')" icon="i-lucide-search" class="w-full" />

        <UCard v-if="open" class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20">
          <div class="space-y-2">
            <UButton
              v-for="result in results || []"
              :key="result.id"
              variant="ghost"
              class="w-full justify-between"
              @click="go(result.to)"
            >
              <span>{{ result.title }}</span>
              <UBadge color="neutral" variant="soft">{{ result.type }}</UBadge>
            </UButton>
          </div>
        </UCard>
      </div>

      <USelect
        :model-value="locale"
        :items="locales"
        value-key="code"
        label-key="name"
        class="w-36"
        @update:model-value="setLocale($event as string)"
      />

      <UColorModeButton />
    </div>
  </header>
</template>
