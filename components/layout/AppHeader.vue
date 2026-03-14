<script setup lang="ts">
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
  <header class="border-b border-default px-4 py-3">
    <div class="flex items-center gap-3">
      <UInput v-model="query" :placeholder="t('search.placeholder')" icon="i-lucide-search" class="flex-1" />
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
    <UCard v-if="open" class="mt-2">
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
  </header>
</template>
