<template>
  <!-- Trigger button (placed in header by parent) -->
  <UTooltip :text="$t('public.admin.title')">
    <UButton
      icon="i-heroicons-qr-code"
      variant="ghost"
      color="neutral"
      size="sm"
      @click="openDrawer"
    />
  </UTooltip>

  <!-- Slideover drawer -->
  <USlideover v-model:open="drawerOpen" :title="$t('public.admin.title')" :description="$t('public.admin.linkLabel')">
    <template #body>
      <div class="space-y-6">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
        </div>

        <!-- No token -->
        <div v-else-if="!token" class="space-y-4 py-4">
          <div class="rounded-lg border border-dashed border-gray-600 p-6 text-center">
            <UIcon name="i-heroicons-qr-code" class="mx-auto mb-3 h-10 w-10 text-gray-500" />
            <p class="text-sm text-gray-400">{{ $t('public.admin.linkLabel') }}</p>
            <UButton class="mt-4" color="primary" icon="i-heroicons-qr-code" :loading="loading" @click="handleGenerate">
              {{ $t('public.admin.generate') }}
            </UButton>
          </div>
        </div>

        <!-- Revoked -->
        <div v-else-if="token.revoked_at" class="space-y-4 py-4">
          <div class="rounded-lg border border-dashed border-amber-600/40 p-6 text-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <p class="text-sm text-amber-400">{{ $t('public.admin.revoked', { date: new Date(token.revoked_at).toLocaleString() }) }}</p>
            <UButton class="mt-4" color="primary" icon="i-heroicons-qr-code" :loading="loading" @click="handleGenerate">
              {{ $t('public.admin.generateNew') }}
            </UButton>
          </div>
        </div>

        <!-- Active token -->
        <div v-else class="space-y-5">
          <!-- QR Code -->
          <ClientOnly>
            <div class="flex justify-center">
              <div class="rounded-xl bg-white p-4">
                <canvas ref="qrCanvas" class="block" style="width:180px;height:180px;" />
              </div>
            </div>
            <template #fallback>
              <div class="flex justify-center">
                <div class="h-[212px] w-[212px] rounded-xl bg-gray-800" />
              </div>
            </template>
          </ClientOnly>

          <!-- Public URL -->
          <div class="space-y-1.5">
            <label class="text-[10px] uppercase tracking-wider text-gray-500">{{ $t('public.admin.publicUrl') }}</label>
            <div class="flex items-center gap-2">
              <code class="flex-1 truncate rounded-md bg-gray-800 px-3 py-2 font-mono text-xs text-gray-300">{{ publicUrl }}</code>
              <UButton icon="i-heroicons-clipboard" size="sm" color="neutral" variant="soft" @click="handleCopy" />
            </div>
          </div>

          <!-- Meta -->
          <div class="grid grid-cols-2 gap-3 rounded-lg bg-gray-800/50 p-3 text-xs">
            <div>
              <div class="text-gray-500">{{ $t('public.admin.createdAt') }}</div>
              <div class="mt-0.5 text-gray-300">{{ new Date(token.created_at).toLocaleDateString() }}</div>
            </div>
            <div>
              <div class="text-gray-500">{{ $t('public.admin.lastAccess') }}</div>
              <div class="mt-0.5 text-gray-300">{{ token.last_access_at ? new Date(token.last_access_at).toLocaleString() : $t('public.admin.lastAccessNever') }}</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="grid grid-cols-2 gap-2">
            <UButton block size="sm" color="neutral" variant="soft" icon="i-heroicons-arrow-down-tray" @click="handleDownloadSvg">
              {{ $t('public.admin.downloadSvg') }}
            </UButton>
            <UButton block size="sm" color="neutral" variant="soft" icon="i-heroicons-photo" @click="handleDownloadPng">
              {{ $t('public.admin.downloadPng') }}
            </UButton>
            <UButton block size="sm" color="neutral" variant="soft" icon="i-heroicons-printer" @click="handlePrintSticker">
              {{ $t('public.admin.printSticker') }}
            </UButton>
            <UButton block size="sm" color="error" variant="soft" icon="i-heroicons-x-mark" @click="showRevokeConfirm = true">
              {{ $t('public.admin.revoke') }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <SharedConfirmDialog
    v-model="showRevokeConfirm"
    :title="$t('public.admin.revoke')"
    :message="$t('public.admin.revokeConfirm')"
    @confirm="handleRevoke"
  />
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{
  switchId: string
  switchName: string
  switchLocation?: string
}>()

const { t } = useI18n()
const toast = useToast()

const drawerOpen = ref(false)
const showRevokeConfirm = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)

const { token, loading, fetchToken, createToken, revokeToken } = usePublicToken(props.switchId)

const publicUrl = computed(() => {
  if (!token.value) return ''
  if (import.meta.client) {
    return `${window.location.origin}/p/${token.value.token}`
  }
  return `/p/${token.value.token}`
})

function openDrawer() {
  drawerOpen.value = true
  if (token.value === null && !loading.value) {
    fetchToken()
  }
}

// Render QR code when token becomes available and canvas is mounted
watch([token, qrCanvas], async ([tok, canvas]) => {
  if (tok && !tok.revoked_at && canvas) {
    await nextTick()
    try {
      await QRCode.toCanvas(canvas, publicUrl.value, {
        width: 180,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
    } catch {
      // QR render failed silently
    }
  }
})

async function handleGenerate() {
  try {
    await createToken()
    toast.add({ title: t('public.admin.generated'), color: 'success' })
  } catch {
    toast.add({ title: t('public.admin.generateFailed'), color: 'error' })
  }
}

async function handleRevoke() {
  showRevokeConfirm.value = false
  try {
    await revokeToken()
    toast.add({ title: t('public.admin.revokedSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('public.admin.revokeFailed'), color: 'error' })
  }
}

async function handleCopy() {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(publicUrl.value)
    } else {
      // Fallback for HTTP / non-secure contexts
      const textarea = document.createElement('textarea')
      textarea.value = publicUrl.value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    toast.add({ title: t('public.admin.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('public.admin.copyFailed'), color: 'error' })
  }
}

async function handleDownloadSvg() {
  if (!token.value) return
  try {
    const svg = await QRCode.toString(publicUrl.value, {
      type: 'svg',
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${props.switchName.replace(/\s+/g, '-')}.svg`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.add({ title: t('public.admin.downloadFailed'), color: 'error' })
  }
}

async function handleDownloadPng() {
  if (!token.value) return
  try {
    const dataUrl = await QRCode.toDataURL(publicUrl.value, {
      width: 512,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-${props.switchName.replace(/\s+/g, '-')}.png`
    a.click()
  } catch {
    toast.add({ title: t('public.admin.downloadFailed'), color: 'error' })
  }
}

async function handlePrintSticker() {
  if (!token.value) return
  try {
    const dataUrl = await QRCode.toDataURL(publicUrl.value, {
      width: 300,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
    const win = window.open('', '_blank')
    if (!win) return
    const location = props.switchLocation ? `<div style="font-size:9px;color:#555;">${props.switchLocation}</div>` : ''
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Switch QR Sticker</title>
  <style>
    @page { size: 62mm 29mm; margin: 0; }
    body { margin: 0; padding: 0; font-family: sans-serif; }
    .sticker {
      width: 62mm; height: 29mm;
      display: flex; align-items: center; gap: 3mm;
      padding: 2mm;
      box-sizing: border-box;
    }
    img { width: 23mm; height: 23mm; display: block; }
    .info { flex: 1; overflow: hidden; }
    .name { font-size: 11px; font-weight: bold; line-height: 1.2; }
    .loc { font-size: 9px; color: #555; margin-top: 1mm; }
    .url { font-size: 7px; color: #888; margin-top: 2mm; word-break: break-all; }
    .brand { font-size: 7px; color: #aaa; margin-top: auto; }
  </style>
</head>
<body>
  <div class="sticker">
    <img src="${dataUrl}" />
    <div class="info">
      <div class="name">${props.switchName}</div>
      ${location}
      <div class="url">${publicUrl.value}</div>
      <div class="brand">ezSWM</div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); window.close(); }<${'/'}script>
</body>
</html>`)
    win.document.close()
  } catch {
    toast.add({ title: t('public.admin.printFailed'), color: 'error' })
  }
}
</script>
