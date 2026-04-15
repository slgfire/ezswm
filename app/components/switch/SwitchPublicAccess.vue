<template>
  <div class="rounded-lg border border-default bg-default/30 p-4">
    <button class="flex w-full items-center justify-between text-left" @click="expanded = !expanded">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ $t('public.admin.title') }}</h3>
      <UIcon :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-4 w-4 text-gray-400" />
    </button>

    <div v-if="expanded" class="mt-4 space-y-4">
      <!-- Loading state -->
      <div v-if="loading" class="flex items-center gap-2 text-sm text-gray-400">
        <UIcon name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin" />
        <span>{{ $t('common.loading') }}</span>
      </div>

      <!-- No token state -->
      <div v-else-if="!token" class="space-y-2">
        <p class="text-xs text-gray-500">{{ $t('public.admin.linkLabel') }}</p>
        <UButton size="sm" color="primary" variant="soft" icon="i-heroicons-qr-code" :loading="loading" @click="handleGenerate">
          {{ $t('public.admin.generate') }}
        </UButton>
      </div>

      <!-- Revoked state -->
      <div v-else-if="token.revoked_at" class="space-y-3">
        <p class="text-xs text-amber-500">
          {{ $t('public.admin.revoked', { date: new Date(token.revoked_at).toLocaleString() }) }}
        </p>
        <UButton size="sm" color="primary" variant="soft" icon="i-heroicons-qr-code" :loading="loading" @click="handleGenerate">
          {{ $t('public.admin.generateNew') }}
        </UButton>
      </div>

      <!-- Active token state -->
      <div v-else class="space-y-4">
        <!-- QR Code preview -->
        <ClientOnly>
          <div class="flex items-start gap-4">
            <div class="rounded-lg border border-default bg-white p-2">
              <canvas ref="qrCanvas" class="block" style="width:120px;height:120px;" />
            </div>
            <div class="flex-1 space-y-2 min-w-0">
              <!-- Public URL -->
              <div>
                <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('public.admin.publicUrl') }}</div>
                <p class="mt-0.5 truncate font-mono text-xs text-gray-300">{{ publicUrl }}</p>
              </div>
              <!-- Meta -->
              <div class="flex gap-4 text-xs text-gray-500">
                <div>
                  <span class="text-gray-600">{{ $t('public.admin.createdAt') }}: </span>
                  {{ new Date(token.created_at).toLocaleDateString() }}
                </div>
                <div>
                  <span class="text-gray-600">{{ $t('public.admin.lastAccess') }}: </span>
                  {{ token.last_access_at ? new Date(token.last_access_at).toLocaleString() : $t('public.admin.lastAccessNever') }}
                </div>
              </div>
            </div>
          </div>
          <template #fallback>
            <div class="h-[120px] w-[120px] rounded-lg border border-default bg-gray-800" />
          </template>
        </ClientOnly>

        <!-- Action buttons -->
        <div class="flex flex-wrap gap-2">
          <UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-clipboard" @click="handleCopy">
            {{ $t('public.admin.copyLink') }}
          </UButton>
          <UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-arrow-down-tray" @click="handleDownloadSvg">
            {{ $t('public.admin.downloadSvg') }}
          </UButton>
          <UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-photo" @click="handleDownloadPng">
            {{ $t('public.admin.downloadPng') }}
          </UButton>
          <UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-printer" @click="handlePrintSticker">
            {{ $t('public.admin.printSticker') }}
          </UButton>
          <UButton size="xs" color="error" variant="soft" icon="i-heroicons-x-mark" @click="showRevokeConfirm = true">
            {{ $t('public.admin.revoke') }}
          </UButton>
        </div>
      </div>
    </div>

    <SharedConfirmDialog
      v-model="showRevokeConfirm"
      :title="$t('public.admin.revoke')"
      :message="$t('public.admin.revokeConfirm')"
      @confirm="handleRevoke"
    />
  </div>
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

const expanded = ref(false)
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

// Fetch token when expanded
watch(expanded, async (val) => {
  if (val && token.value === null && !loading.value) {
    await fetchToken()
  }
})

// Render QR code when token becomes available and canvas is mounted
watch([token, qrCanvas], async ([tok, canvas]) => {
  if (tok && !tok.revoked_at && canvas) {
    await nextTick()
    try {
      await QRCode.toCanvas(canvas, publicUrl.value, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
    } catch (e) {
      console.error('QR render failed:', e)
    }
  }
})

async function handleGenerate() {
  try {
    await createToken()
    toast.add({ title: t('public.admin.generated'), color: 'success' })
  } catch {
    toast.add({ title: 'Failed to generate token', color: 'error' })
  }
}

async function handleRevoke() {
  showRevokeConfirm.value = false
  try {
    await revokeToken()
    toast.add({ title: t('public.admin.revokedSuccess'), color: 'success' })
  } catch {
    toast.add({ title: 'Failed to revoke token', color: 'error' })
  }
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    toast.add({ title: t('public.admin.copied'), color: 'success' })
  } catch {
    toast.add({ title: 'Failed to copy', color: 'error' })
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
    toast.add({ title: 'Failed to download SVG', color: 'error' })
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
    toast.add({ title: 'Failed to download PNG', color: 'error' })
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
    toast.add({ title: 'Failed to open print dialog', color: 'error' })
  }
}
</script>
