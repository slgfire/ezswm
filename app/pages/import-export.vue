<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('importExport.title') }}</h1>
    <UTabs :items="tabs">
      <template #item="{ item }">
        <div class="mt-4">
          <SharedEmptyState
            v-if="item.key === 'import'"
            icon="i-heroicons-arrow-up-tray"
            :title="$t('importExport.importEmptyTitle')"
            :description="$t('importExport.importEmptyDescription')"
          />
          <SharedEmptyState
            v-else
            icon="i-heroicons-arrow-down-tray"
            :title="$t('importExport.exportEmptyTitle')"
            :description="$t('importExport.exportEmptyDescription')"
          />
        </div>
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const tabs = computed(() => [
  { key: 'import', label: t('importExport.importTab') },
  { key: 'export', label: t('importExport.exportTab') }
])
</script>
