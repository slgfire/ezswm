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
  <USlideover v-if="authResolved && user" :open="drawerOpen" :title="$t('public.admin.title')" :description="$t('public.pp.linkLabel')" @update:open="onDrawerOpenChange">
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
            <p class="text-sm text-muted">{{ $t('public.pp.linkLabel') }}</p>
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
          <div class="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-xs">
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
            <UButton v-if="canEditInfrastructure" block size="sm" color="error" variant="soft" icon="i-heroicons-x-mark" class="col-span-2" @click="void (showRevokeConfirm = true)">
              {{ $t('public.admin.revoke') }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <SharedConfirmDialog
    v-if="authResolved && user && canEditInfrastructure"
    v-model="showRevokeConfirm"
    :title="$t('public.admin.revoke')"
    :message="$t('public.pp.revokeConfirm')"
    @confirm="handleRevoke"
  />
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import type { PublicToken } from '~~/types/publicToken'

const props = defineProps<{
  panelId: string
  siteId?: string
  panelName: string
}>()

const { t } = useI18n()
const toast = useToast()
const { authResolved, user, canEditInfrastructure, handleInfrastructureForbidden } = useAuth()

const drawerOpen = ref(false)
const showRevokeConfirm = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
let permissionGeneration = 0
let tokenRequestGeneration = 0
let tokenOperationGeneration = 0
let accessChangeNoticeShown = false

const { token, loading } = usePublicToken(
  () => `/api/patch-panels/${props.panelId}/public-token`,
  toRef(() => props.siteId ?? '')
)

function noticeAccessChanged() {
  if (accessChangeNoticeShown) return
  accessChangeNoticeShown = true
  toast.add({ title: t('permissions.accessChanged'), color: 'warning' })
}

function clearQrCanvas() {
  const canvas = qrCanvas.value
  if (!canvas) return
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
}

function isCurrentTarget(panelId: string, siteId: string | undefined) {
  return props.panelId === panelId && (props.siteId ?? '') === (siteId ?? '')
}

function isCurrentRead(request: number, panelId: string, siteId: string | undefined, userId: string) {
  return request === tokenRequestGeneration && authResolved.value && !!user.value && user.value.id === userId &&
    drawerOpen.value && isCurrentTarget(panelId, siteId)
}

function isCurrentOperation(operation: number, permission: number, panelId: string, siteId: string | undefined) {
  return authResolved.value && !!user.value && canEditInfrastructure.value && drawerOpen.value &&
    operation === tokenOperationGeneration && permission === permissionGeneration &&
    isCurrentTarget(panelId, siteId)
}

async function fetchTokenForDrawer() {
  if (!authResolved.value || !user.value || !drawerOpen.value) return
  const request = ++tokenRequestGeneration
  const panelId = props.panelId
  const siteId = props.siteId
  const userId = user.value.id
  loading.value = true
  try {
    const data = await $fetch<PublicToken>(`/api/patch-panels/${panelId}/public-token`, {
      query: siteId ? { siteId } : undefined
    })
    if (isCurrentRead(request, panelId, siteId, userId)) token.value = data
  } catch (error: unknown) {
    const status = (error as { statusCode?: number; status?: number })?.statusCode ?? (error as { status?: number })?.status
    if (status === 404 && isCurrentRead(request, panelId, siteId, userId)) token.value = null
    if (status !== 404) {
      const access = await handleInfrastructureForbidden(error)
      if (access === 'demoted') noticeAccessChanged()
      if (isCurrentRead(request, panelId, siteId, userId)) token.value = null
    }
  } finally {
    if (request === tokenRequestGeneration) loading.value = false
  }
}

const publicUrl = computed(() => {
  if (!token.value) return ''
  if (import.meta.client) {
    return `${window.location.origin}/p/pp/${token.value.token}`
  }
  return `/p/pp/${token.value.token}`
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
  showRevokeConfirm.value = false
  tokenRequestGeneration++
  tokenOperationGeneration++
  loading.value = false
}

// Render the existing token for both Admin and Viewer accounts.
watch([token, qrCanvas, authResolved, user, drawerOpen], async ([tok, canvas, resolved, currentUser, isOpen]) => {
  const panelId = props.panelId
  const siteId = props.siteId
  const request = tokenRequestGeneration
  const userId = currentUser?.id
  if (tok && !tok.revoked_at && canvas && resolved && userId && isOpen) {
    await nextTick()
    if (!userId || !isCurrentRead(request, panelId, siteId, userId) || token.value !== tok || !canvas.isConnected) return
    try {
      await QRCode.toCanvas(canvas, publicUrl.value, {
        width: 180,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
      if (!isCurrentRead(request, panelId, siteId, userId) || token.value !== tok) clearQrCanvas()
    } catch {
      // QR render failed silently
    }
  }
})

async function handleGenerate() {
  if (!authResolved.value || !user.value || !canEditInfrastructure.value || !drawerOpen.value) return
  const permission = permissionGeneration
  const panelId = props.panelId
  const siteId = props.siteId
  const operation = ++tokenOperationGeneration
  tokenRequestGeneration++
  loading.value = true
  try {
    const data = await $fetch<PublicToken>(`/api/patch-panels/${panelId}/public-token`, {
      method: 'POST',
      query: siteId ? { siteId } : undefined
    })
    if (!isCurrentOperation(operation, permission, panelId, siteId)) return
    token.value = data
    toast.add({ title: t('public.admin.generated'), color: 'success' })
  } catch (error: unknown) {
    const access = await handleInfrastructureForbidden(error)
    if (access === 'demoted') noticeAccessChanged()
    if (access === 'demoted' || access === 'already-handled') return
    if (!isCurrentOperation(operation, permission, panelId, siteId)) return
    toast.add({ title: t('public.admin.generateFailed'), color: 'error' })
  } finally {
    if (operation === tokenOperationGeneration || !canEditInfrastructure.value) loading.value = false
  }
}

async function handleRevoke() {
  if (!authResolved.value || !user.value || !canEditInfrastructure.value || !drawerOpen.value || !showRevokeConfirm.value) return
  const permission = permissionGeneration
  const panelId = props.panelId
  const siteId = props.siteId
  const previousToken = token.value
  const operation = ++tokenOperationGeneration
  tokenRequestGeneration++
  showRevokeConfirm.value = false
  loading.value = true
  try {
    // Keep the follow-up token read outside usePublicToken.revokeToken so permission is rechecked first.
    await $fetch(`/api/patch-panels/${panelId}/public-token`, {
      method: 'DELETE',
      query: siteId ? { siteId } : undefined
    })
    if (!isCurrentOperation(operation, permission, panelId, siteId)) {
      if (token.value === previousToken && isCurrentTarget(panelId, siteId)) token.value = null
      return
    }
    toast.add({ title: t('public.admin.revokedSuccess'), color: 'success' })
    await fetchTokenForDrawer()
  } catch (error: unknown) {
    const access = await handleInfrastructureForbidden(error)
    if (access === 'demoted') noticeAccessChanged()
    if (access === 'demoted' || access === 'already-handled') return
    if (!isCurrentOperation(operation, permission, panelId, siteId)) return
    toast.add({ title: t('public.admin.revokeFailed'), color: 'error' })
  } finally {
    if (operation === tokenOperationGeneration || !canEditInfrastructure.value) loading.value = false
  }
}

watch(canEditInfrastructure, (canEdit, wasEditable) => {
  if (canEdit === wasEditable) return
  permissionGeneration++
  tokenOperationGeneration++
  showRevokeConfirm.value = false
  if (!canEdit) loading.value = false
  if (canEdit) accessChangeNoticeShown = false
}, { flush: 'sync' })

async function handleCopy() {
  if (!authResolved.value || !user.value || !drawerOpen.value || !token.value || token.value.revoked_at) return
  const tok = token.value
  const panelId = props.panelId
  const siteId = props.siteId
  const userId = user.value.id
  const request = tokenRequestGeneration
  const text = publicUrl.value
  let copied = false

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      if (!isCurrentRead(request, panelId, siteId, userId) || token.value !== tok) return
      copied = true
    } catch { /* fall through */ }
  }

  if (!copied) {
    if (!isCurrentRead(request, panelId, siteId, userId) || token.value !== tok) return
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.contentEditable = 'true'
      el.style.position = 'fixed'
      el.style.opacity = '0'
      el.style.fontSize = '16px'
      document.body.appendChild(el)
      el.focus()
      el.setSelectionRange(0, el.value.length)
      copied = document.execCommand('copy')
      document.body.removeChild(el)
    } catch { /* fall through */ }
  }

  if (!isCurrentRead(request, panelId, siteId, userId) || token.value !== tok) return

  if (!copied) {
    toast.add({ title: t('public.admin.copyFailed'), color: 'error' })
    return
  }

  toast.add({ title: t('public.admin.copied'), color: 'success' })
}

async function handleDownloadSvg() {
  if (!authResolved.value || !user.value || !drawerOpen.value || !token.value || token.value.revoked_at) return
  const tok = token.value
  const panelId = props.panelId
  const siteId = props.siteId
  const userId = user.value.id
  const request = tokenRequestGeneration
  try {
    const svg = await QRCode.toString(publicUrl.value, {
      type: 'svg',
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
    if (!isCurrentRead(request, panelId, siteId, userId) || token.value !== tok) return
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-pp-${props.panelName.replace(/\s+/g, '-')}.svg`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    if (isCurrentRead(request, panelId, siteId, userId) && token.value === tok) toast.add({ title: t('public.admin.downloadFailed'), color: 'error' })
  }
}

async function handleDownloadPng() {
  if (!authResolved.value || !user.value || !drawerOpen.value || !token.value || token.value.revoked_at) return
  const tok = token.value
  const panelId = props.panelId
  const siteId = props.siteId
  const userId = user.value.id
  const request = tokenRequestGeneration
  try {
    const dataUrl = await QRCode.toDataURL(publicUrl.value, {
      width: 512,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
    if (!isCurrentRead(request, panelId, siteId, userId) || token.value !== tok) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-pp-${props.panelName.replace(/\s+/g, '-')}.png`
    a.click()
  } catch {
    if (isCurrentRead(request, panelId, siteId, userId) && token.value === tok) toast.add({ title: t('public.admin.downloadFailed'), color: 'error' })
  }
}

watch([authResolved, user], ([resolved, currentUser]) => {
  if (resolved && currentUser) return
  permissionGeneration++
  tokenRequestGeneration++
  tokenOperationGeneration++
  drawerOpen.value = false
  showRevokeConfirm.value = false
  token.value = null
  loading.value = false
  clearQrCanvas()
}, { flush: 'sync' })

watch(() => `${props.panelId}\u0000${props.siteId ?? ''}`, () => {
  permissionGeneration++
  tokenRequestGeneration++
  tokenOperationGeneration++
  showRevokeConfirm.value = false
  token.value = null
  loading.value = false
  clearQrCanvas()
  if (drawerOpen.value && authResolved.value && user.value) void fetchTokenForDrawer()
}, { flush: 'sync' })
</script>
