<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  width?: 'md' | 'lg'
  hasUnsavedChanges?: boolean
}>(), {
  description: '',
  width: 'lg',
  hasUnsavedChanges: false
})

const emit = defineEmits<{ close: [] }>()

function requestClose() {
  if (props.hasUnsavedChanges && !window.confirm('You have unsaved changes. Close anyway?')) {
    return
  }

  emit('close')
}
</script>

<template>
  <USlideover :open="open" :dismissible="true" :ui="{ content: width === 'md' ? 'max-w-2xl' : 'max-w-4xl' }" @update:open="(v) => !v && requestClose()">
    <template #content>
      <UCard class="h-full rounded-none border-0">
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <h2 class="text-lg font-semibold">{{ title }}</h2>
              <p v-if="description" class="text-sm text-muted">{{ description }}</p>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="requestClose" />
          </div>
        </template>

        <div class="space-y-4">
          <slot />
        </div>
      </UCard>
    </template>
  </USlideover>
</template>
