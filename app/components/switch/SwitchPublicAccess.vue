<template>
  <!-- Trigger button (placed in header by parent) -->
  <UTooltip v-if="authResolved && user" :text="$t('public.admin.title')">
    <UButton
      icon="i-heroicons-qr-code"
      variant="ghost"
      color="neutral"
      size="sm"
      class="cursor-pointer"
      @click="openDrawer"
    />
  </UTooltip>

  <!-- Slideover drawer -->
  <USlideover v-if="authResolved && user" :open="drawerOpen" :title="$t('public.admin.title')" :description="$t('public.admin.linkLabel')" @update:open="onDrawerOpenChange">
    <template #body>
      <div class="space-y-6">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" />
        </div>

        <!-- No token -->
        <div v-else-if="!token" class="space-y-4 py-4">
          <div class="rounded-lg border border-dashed border-accented p-6 text-center">
            <UIcon name="i-heroicons-qr-code" class="mx-auto mb-3 h-10 w-10 text-muted" />
            <p class="text-sm text-muted">{{ $t('public.admin.linkLabel') }}</p>
            <UButton v-if="canEditInfrastructure" class="mt-4" color="primary" icon="i-heroicons-qr-code" :loading="loading" @click="handleGenerate">
              {{ $t('public.admin.generate') }}
            </UButton>
            <p v-else class="mt-4 text-sm text-muted">{{ $t('permissions.qrUnavailable') }}</p>
          </div>
        </div>

        <!-- Revoked -->
        <div v-else-if="token.revoked_at" class="space-y-4 py-4">
          <div class="rounded-lg border border-dashed border-amber-600/40 p-6 text-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <p v-if="canEditInfrastructure" class="text-sm text-amber-400">{{ $t('public.admin.revoked', { date: new Date(token.revoked_at).toLocaleString() }) }}</p>
            <p v-else class="text-sm text-muted">{{ $t('permissions.qrUnavailable') }}</p>
            <UButton v-if="canEditInfrastructure" class="mt-4" color="primary" icon="i-heroicons-qr-code" :loading="loading" @click="handleGenerate">
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
                <div class="h-[212px] w-[212px] rounded-xl bg-elevated" />
              </div>
            </template>
          </ClientOnly>

          <!-- Public URL -->
          <div class="space-y-1.5">
            <label class="text-[10px] uppercase tracking-wider text-muted">{{ $t('public.admin.publicUrl') }}</label>
            <div class="flex items-center gap-2">
              <code class="flex-1 truncate rounded-md bg-elevated px-3 py-2 font-mono text-xs text-toned">{{ publicUrl }}</code>
              <UButton icon="i-heroicons-clipboard" size="sm" color="neutral" variant="soft" @click="handleCopy" />
            </div>
          </div>

          <!-- Meta -->
          <div class="grid grid-cols-2 gap-3 rounded-lg bg-elevated/50 p-3 text-xs">
            <div>
              <div class="text-muted">{{ $t('public.admin.createdAt') }}</div>
              <div class="mt-0.5 text-toned">{{ new Date(token.created_at).toLocaleDateString() }}</div>
            </div>
            <div>
              <div class="text-muted">{{ $t('public.admin.lastAccess') }}</div>
              <div class="mt-0.5 text-toned">{{ token.last_access_at ? new Date(token.last_access_at).toLocaleString() : $t('public.admin.lastAccessNever') }}</div>
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
            <UButton v-if="canEditInfrastructure" block size="sm" color="error" variant="soft" icon="i-heroicons-x-mark" @click="void (showRevokeConfirm = true)">
              {{ $t('public.admin.revoke') }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <SharedConfirmDialog
    v-if="authResolved && canEditInfrastructure"
    v-model="showRevokeConfirm"
    :title="$t('public.admin.revoke')"
    :message="$t('public.admin.revokeConfirm')"
    @confirm="handleRevoke"
  />
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import type { PublicToken } from '~~/types/publicToken'

const props = defineProps<{
  switchId: string
  siteId?: string
  switchName: string
  switchLocation?: string
}>()

const { t } = useI18n()
const toast = useToast()
const { authResolved, user, canEditInfrastructure, handleInfrastructureForbidden } = useAuth()

const drawerOpen = ref(false)
const showRevokeConfirm = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)

const { token, loading } = usePublicToken(props.switchId, toRef(() => props.siteId ?? ''))

const emit = defineEmits<{ 'access-changed': [] }>()

let readGeneration = 0
let permissionGeneration = 0
let operationGeneration = 0
let accessChangeNoticeShown = false

function tokenPath(switchId: string) {
  return `/api/switches/${switchId}/public-token`
}

function tokenQuery(siteId: string | undefined) {
  return siteId ? { siteId } : undefined
}

function isCurrentRead(request: number, switchId: string, siteId: string | undefined, userId: string) {
  return request === readGeneration && authResolved.value && !!user.value && user.value.id === userId &&
    drawerOpen.value && props.switchId === switchId && (props.siteId ?? '') === (siteId ?? '')
}

function isCurrentOperation(operation: number, permission: number, switchId: string, siteId: string | undefined) {
  return authResolved.value && !!user.value && canEditInfrastructure.value && drawerOpen.value &&
    operation === operationGeneration && permission === permissionGeneration &&
    props.switchId === switchId && (props.siteId ?? '') === (siteId ?? '')
}

function clearQrCanvas() {
  const canvas = qrCanvas.value
  if (!canvas) return
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
}

function noticeAccessChanged() {
  if (accessChangeNoticeShown) return
  accessChangeNoticeShown = true
  emit('access-changed')
}

const publicUrl = computed(() => {
  if (!token.value) return ''
  if (import.meta.client) {
    return `${window.location.origin}/p/${token.value.token}`
  }
  return `/p/${token.value.token}`
})

function openDrawer() {
  if (!authResolved.value || !user.value) return
  drawerOpen.value = true
  if (token.value === null && !loading.value) {
    void fetchTokenForDrawer()
  }
}

function onDrawerOpenChange(open: boolean) {
  if (open) {
    openDrawer()
    return
  }
  drawerOpen.value = false
  readGeneration++
  operationGeneration++
  showRevokeConfirm.value = false
  loading.value = false
  clearQrCanvas()
}

async function fetchTokenForDrawer() {
  if (!authResolved.value || !user.value || !drawerOpen.value) return
  const request = ++readGeneration
  const switchId = props.switchId
  const siteId = props.siteId
  const userId = user.value.id
  loading.value = true
  try {
    const data = await $fetch<PublicToken>(tokenPath(switchId), { query: tokenQuery(siteId) })
    if (isCurrentRead(request, switchId, siteId, userId)) token.value = data
  } catch (error: unknown) {
    const status = (error as { statusCode?: number; status?: number })?.statusCode ?? (error as { status?: number })?.status
    if (isCurrentRead(request, switchId, siteId, userId) && status === 404) token.value = null
    if (status !== 404) {
      const access = await handleInfrastructureForbidden(error)
      if (access === 'demoted') noticeAccessChanged()
      if (isCurrentRead(request, switchId, siteId, userId)) token.value = null
    }
  } finally {
    if (request === readGeneration) loading.value = false
  }
}

// Render QR code when token becomes available and canvas is mounted
watch([token, qrCanvas], async ([tok, canvas]) => {
  const request = readGeneration
  const switchId = props.switchId
  const siteId = props.siteId
  const userId = user.value?.id
  if (tok && !tok.revoked_at && canvas && authResolved.value && userId && drawerOpen.value) {
    await nextTick()
    if (!userId || !isCurrentRead(request, switchId, siteId, userId) || token.value !== tok || !canvas.isConnected) return
    try {
      await QRCode.toCanvas(canvas, publicUrl.value, {
        width: 180,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
      if (!isCurrentRead(request, switchId, siteId, userId) || token.value !== tok) clearQrCanvas()
    } catch {
      // QR render failed silently
    }
  }
})

async function handleGenerate() {
  if (!authResolved.value || !user.value || !canEditInfrastructure.value || !drawerOpen.value) return
  const permission = permissionGeneration
  const switchId = props.switchId
  const siteId = props.siteId
  const operation = ++operationGeneration
  readGeneration++
  loading.value = true
  try {
    const data = await $fetch<PublicToken>(tokenPath(switchId), { method: 'POST', query: tokenQuery(siteId) })
    if (!isCurrentOperation(operation, permission, switchId, siteId)) return
    token.value = data
    toast.add({ title: t('public.admin.generated'), color: 'success' })
  } catch (error: unknown) {
    const access = await handleInfrastructureForbidden(error)
    if (access === 'demoted') emit('access-changed')
    if (access === 'demoted' || access === 'already-handled') return
    if (isCurrentOperation(operation, permission, switchId, siteId)) toast.add({ title: t('public.admin.generateFailed'), color: 'error' })
  } finally {
    if (operation === operationGeneration || !canEditInfrastructure.value) loading.value = false
  }
}

async function handleRevoke() {
  if (!authResolved.value || !user.value || !canEditInfrastructure.value || !drawerOpen.value || !showRevokeConfirm.value) {
    showRevokeConfirm.value = false
    return
  }
  const permission = permissionGeneration
  const switchId = props.switchId
  const siteId = props.siteId
  const previousToken = token.value
  const operation = ++operationGeneration
  readGeneration++
  showRevokeConfirm.value = false
  loading.value = true
  try {
    await $fetch(tokenPath(switchId), { method: 'DELETE', query: tokenQuery(siteId) })
    if (!isCurrentOperation(operation, permission, switchId, siteId)) {
      if (token.value === previousToken && props.switchId === switchId && (props.siteId ?? '') === (siteId ?? '')) token.value = null
      return
    }
    toast.add({ title: t('public.admin.revokedSuccess'), color: 'success' })
    await fetchTokenForDrawer()
  } catch (error: unknown) {
    const access = await handleInfrastructureForbidden(error)
    if (access === 'demoted') emit('access-changed')
    if (access === 'demoted' || access === 'already-handled') return
    if (isCurrentOperation(operation, permission, switchId, siteId)) toast.add({ title: t('public.admin.revokeFailed'), color: 'error' })
  } finally {
    if (operation === operationGeneration || !canEditInfrastructure.value) loading.value = false
  }
}

async function handleCopy() {
  if (!authResolved.value || !user.value || !drawerOpen.value || !token.value || token.value.revoked_at) return
  const tok = token.value
  const switchId = props.switchId
  const siteId = props.siteId
  const userId = user.value.id
  const request = readGeneration
  const text = publicUrl.value
  let copied = false

  // Try clipboard API first (works on HTTPS + user gesture)
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      if (!isCurrentRead(request, switchId, siteId, userId) || token.value !== tok) return
      copied = true
    } catch { /* fall through */ }
  }

  // Fallback: textarea + execCommand (desktop HTTP, older browsers)
  if (!copied) {
    if (!isCurrentRead(request, switchId, siteId, userId) || token.value !== tok) return
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.contentEditable = 'true'
      el.style.position = 'fixed'
      el.style.opacity = '0'
      el.style.fontSize = '16px' // prevent iOS zoom
      document.body.appendChild(el)
      el.focus()
      el.setSelectionRange(0, el.value.length)
      copied = document.execCommand('copy')
      document.body.removeChild(el)
    } catch { /* fall through */ }
  }

  if (!isCurrentRead(request, switchId, siteId, userId) || token.value !== tok) return

  // Last resort: the link is shown in the panel, so just flag the failure.
  if (!copied) {
    toast.add({ title: t('public.admin.copyFailed'), color: 'error' })
    return
  }

  toast.add({ title: t('public.admin.copied'), color: 'success' })
}

async function handleDownloadSvg() {
  if (!authResolved.value || !user.value || !drawerOpen.value || !token.value || token.value.revoked_at) return
  const tok = token.value
  const switchId = props.switchId
  const siteId = props.siteId
  const userId = user.value.id
  const request = readGeneration
  try {
    const svg = await QRCode.toString(publicUrl.value, {
      type: 'svg',
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
    if (!isCurrentRead(request, switchId, siteId, userId) || token.value !== tok) return
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
  if (!authResolved.value || !user.value || !drawerOpen.value || !token.value || token.value.revoked_at) return
  const tok = token.value
  const switchId = props.switchId
  const siteId = props.siteId
  const userId = user.value.id
  const request = readGeneration
  try {
    const dataUrl = await QRCode.toDataURL(publicUrl.value, {
      width: 512,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
    if (!isCurrentRead(request, switchId, siteId, userId) || token.value !== tok) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-${props.switchName.replace(/\s+/g, '-')}.png`
    a.click()
  } catch {
    toast.add({ title: t('public.admin.downloadFailed'), color: 'error' })
  }
}

function handlePrintSticker() {
  if (!authResolved.value || !user.value || !drawerOpen.value || !token.value || token.value.revoked_at) return
  // Use the same qr-print page as bulk print for consistent output
  const route = useRoute()
  const siteId = route.params.siteId || 'all'
  window.open(`/sites/${siteId}/switches/qr-print?ids=${props.switchId}`, '_blank')
}

watch(canEditInfrastructure, (canEdit, wasEditable) => {
  if (canEdit === wasEditable) return
  permissionGeneration++
  operationGeneration++
  showRevokeConfirm.value = false
  if (!canEdit) loading.value = false
  if (canEdit) accessChangeNoticeShown = false
}, { flush: 'sync' })

watch([authResolved, user], ([resolved, currentUser]) => {
  if (resolved && currentUser) return
  readGeneration++
  permissionGeneration++
  operationGeneration++
  drawerOpen.value = false
  showRevokeConfirm.value = false
  token.value = null
  loading.value = false
  clearQrCanvas()
}, { flush: 'sync' })

watch(() => `${props.switchId}\u0000${props.siteId ?? ''}`, () => {
  readGeneration++
  permissionGeneration++
  operationGeneration++
  showRevokeConfirm.value = false
  token.value = null
  loading.value = false
  clearQrCanvas()
  if (drawerOpen.value && authResolved.value && user.value) void fetchTokenForDrawer()
}, { flush: 'sync' })
</script>
