<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold">{{ $t('topology.title') }}</h1>
    <SharedEmptyState
      icon="i-heroicons-share"
      :title="$t('topology.emptyTitle')"
      :description="$t('topology.emptyDescription')"
    />
  </div>
</template>
