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

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    requestClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div v-if="open" class="drawer-overlay" @click="requestClose" />
    </Transition>

    <Transition name="drawer-slide">
      <aside v-if="open" class="drawer" :class="`drawer--${width}`" role="dialog" aria-modal="true">
        <header class="drawer__header">
          <div class="stack" style="gap: .2rem;">
            <h2 class="drawer__title">{{ title }}</h2>
            <p v-if="description" class="drawer__description">{{ description }}</p>
          </div>
          <button class="secondary" @click="requestClose">Close</button>
        </header>
        <div class="drawer__body">
          <slot />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
