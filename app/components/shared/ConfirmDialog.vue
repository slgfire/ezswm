<template>
  <UModal v-model="model">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-500" />
          <h3 class="text-lg font-semibold">{{ title }}</h3>
        </div>
      </template>

      <p class="text-sm text-gray-400">{{ message }}</p>

      <slot />

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="model = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton color="red" :loading="loading" @click="$emit('confirm')">
            {{ confirmLabel || $t('common.confirm') }}
          </UButton>
        </div>
      </template>
    </UCard>
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
