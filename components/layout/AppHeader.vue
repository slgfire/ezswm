<script setup lang="ts">
const query = ref('')
const open = ref(false)
const { locale, locales, t } = useI18n()
const router = useRouter()

const { data: results, refresh } = await useFetch('/api/search', {
  query: { q: query },
  immediate: false
})

watch(query, async (value) => {
  if (!value.trim()) return
  await refresh()
})

function selectResult(route: string) {
  open.value = false
  query.value = ''
  router.push(route)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <UInput v-model="query" :placeholder="t('search.placeholder')" icon="i-lucide-search" class="w-full max-w-xl" @focus="open = true" />

    <USelect
      v-model="locale"
      :items="locales.map((item: any) => ({ label: item.name, value: item.code }))"
      class="w-36"
    />

    <UColorModeButton />

    <UDropdownMenu :items="[{ label: 'GitHub', icon: 'i-lucide-github', to: 'https://github.com/slgfire/website-saarlan-eccm', target: '_blank' }]">
      <UButton icon="i-lucide-link" color="neutral" variant="ghost" />
    </UDropdownMenu>

    <UModal v-model:open="open" :title="t('search.results')">
      <template #body>
        <div class="space-y-2">
          <p class="text-sm text-muted">{{ t('search.helper') }}</p>
          <UInput v-model="query" :placeholder="t('search.placeholder')" icon="i-lucide-search" />
          <div class="max-h-80 overflow-auto space-y-2">
            <UCard v-for="item in results || []" :key="`${item.type}-${item.route}`" class="cursor-pointer" @click="selectResult(item.route)">
              <div class="flex justify-between items-center">
                <div>
                  <p class="font-medium">{{ item.label }}</p>
                  <p class="text-xs text-muted">{{ item.route }}</p>
                </div>
                <UBadge color="primary" variant="soft">{{ item.type }}</UBadge>
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
