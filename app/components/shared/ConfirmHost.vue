<template>
  <SharedConfirmDialog
    v-if="options"
    v-model="open"
    :title="options.title"
    :message="options.message"
    :confirm-label="options.confirmLabel"
    @confirm="onConfirm"
  />
</template>

<script setup lang="ts">
// Single global confirmation modal driven by useConfirm(). Mounted once in
// app.vue. Replaces native window.confirm() across the app.
const { open, options, settle } = useConfirm()

let confirmed = false

function onConfirm() {
  confirmed = true
  settle(true)
}

// Any close that wasn't an explicit confirm (cancel button, ESC, backdrop)
// resolves the pending promise as `false`.
watch(open, (isOpen) => {
  if (isOpen) {
    confirmed = false
  } else if (!confirmed) {
    settle(false)
  }
})
</script>
