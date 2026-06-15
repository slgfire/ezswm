<template>
  <UModal
    :open="model"
    :title="title"
    :ui="{ overlay: 'z-[200]', content: 'z-[200]' }"
    @close="model = false"
  >
    <template #title>
      <span class="flex items-center gap-2">
        <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-500" />
        <span class="text-lg font-semibold">{{ title }}</span>
      </span>
    </template>

    <template #body>
      <p class="text-sm text-gray-400">{{ message }}</p>
      <slot />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="model = false">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton color="error" :loading="loading" @click="$emit('confirm')">
          {{ confirmLabel || $t('common.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const model = defineModel<boolean>({ required: true })

defineProps<{
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
}>()

defineEmits<{ confirm: [] }>()
</script>
