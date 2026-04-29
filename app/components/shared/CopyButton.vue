<template>
  <button
    class="inline-flex items-center cursor-copy transition-colors duration-150"
    :class="copied ? 'text-green-500' : ''"
    :title="$t('common.copyToClipboard')"
    @click.stop="copy"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: string
}>()

const { t } = useI18n()
const toast = useToast()
const copied = ref(false)
let timeout: ReturnType<typeof setTimeout> | null = null

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback for non-secure contexts (HTTP)
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function copy() {
  if (!props.value) return
  copyToClipboard(props.value)
  copied.value = true
  toast.add({ title: `${t('common.copied')} ${props.value}`, color: 'success' })
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(() => { copied.value = false }, 1500)
}
</script>
