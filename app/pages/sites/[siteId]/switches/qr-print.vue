<template>
  <div class="print-preview">
    <!-- Toolbar (hidden in print) -->
    <div class="toolbar mb-4 flex items-center gap-3">
      <UButton icon="i-heroicons-x-mark" variant="ghost" size="sm" @click="onClose">
        {{ $t('common.close') }}
      </UButton>
      <span class="text-sm toolbar-count">
        {{ stickers.length }} {{ stickers.length === 1 ? 'QR Sticker' : 'QR Stickers' }}
      </span>
      <UButton icon="i-heroicons-printer" size="sm" :disabled="stickers.length === 0" @click="onPrint">
        {{ $t('common.print') }}
      </UButton>
    </div>

    <div v-if="!loading && !canEditInfrastructure && unavailableSwitches.length" class="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
      <p>{{ $t('permissions.qrUnavailable') }}</p>
      <p class="mt-1 text-xs opacity-80">{{ unavailableSwitches.join(', ') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="text-sm muted">Loading...</div>
    </div>

    <!-- No switches -->
    <div v-else-if="stickers.length === 0" class="py-12 text-center muted">
      {{ canEditInfrastructure ? 'No switches with public QR codes found.' : $t('permissions.qrUnavailable') }}
    </div>

    <!-- A4 sheet: Zweckform/Avery 3475, 3 × 8 labels à 70mm × 37mm.
         Horizontal scroll on small viewports keeps physical preview size. -->
    <div v-else class="sheet-scroll">
      <div class="sheet">
        <div
          v-for="sticker in stickers"
          :key="sticker.id"
          class="sticker-cell"
        >
          <canvas :ref="(el: Element | null) => setCanvasRef(sticker.id, el as HTMLCanvasElement)" class="sticker-qr" :aria-label="`QR code for ${sticker.name}`" role="img" />
          <div class="sticker-info">
            <div class="sticker-name">{{ sticker.name }}</div>
            <div v-if="sticker.model" class="sticker-model">{{ sticker.model }}</div>
            <div v-if="sticker.location" class="sticker-location">{{ sticker.location }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({ layout: 'print' })

const route = useRoute()
const ids = computed(() => {
  const raw = route.query.ids as string
  return raw ? raw.split(',') : []
})

interface Sticker {
  id: string
  name: string
  model?: string
  location?: string
  url: string
  token: string
}

const stickers = ref<Sticker[]>([])
const unavailableSwitches = ref<string[]>([])
const loading = ref(true)
const canvasRefs = new Map<string, HTMLCanvasElement>()
const { canEditInfrastructure, fetchUser, handleInfrastructureForbidden } = useAuth()

function setCanvasRef(id: string, el: HTMLCanvasElement | null) {
  if (el) canvasRefs.set(id, el)
}

onMounted(async () => {
  try {
    // Resolve the latest role before a missing/revoked-token branch can decide
    // whether token creation is allowed for this print request.
    await fetchUser()

    // Fetch switches (API returns { data: [...] } envelope)
    const switchesRes = await $fetch<{ data: { id: string; name: string; model?: string; location?: string; manufacturer?: string }[] }>('/api/switches')
    const switchList = switchesRes?.data || []

    const result: Sticker[] = []
    for (const swId of ids.value) {
      const sw = switchList.find(s => s.id === swId)
      if (!sw) continue

      try {
        let tokenData: { token: string; revoked_at: string | null } | null = null
        const canCreate = canEditInfrastructure.value

        if (!canCreate) {
          // Viewers may print only an already-existing, non-revoked token.
          // Missing, revoked, and failed GETs never fall through to POST.
          try {
            tokenData = await $fetch<{ token: string; revoked_at: string | null }>(`/api/switches/${swId}/public-token`)
          } catch {
            unavailableSwitches.value.push(sw.name)
            continue
          }
          if (!tokenData?.token || tokenData.revoked_at) {
            unavailableSwitches.value.push(sw.name)
            continue
          }
        } else {
          // Keep the established Admin create/revive behavior, but refresh
          // role state immediately before any fallback token write.
          try {
            tokenData = await $fetch<{ token: string; revoked_at: string | null }>(`/api/switches/${swId}/public-token`)
          } catch {
            await fetchUser()
            if (!canEditInfrastructure.value) {
              unavailableSwitches.value.push(sw.name)
              continue
            }
            tokenData = await $fetch<{ token: string; revoked_at: string | null }>(`/api/switches/${swId}/public-token`, { method: 'POST' })
          }

          if (tokenData?.revoked_at) {
            await fetchUser()
            if (!canEditInfrastructure.value) {
              unavailableSwitches.value.push(sw.name)
              continue
            }
            tokenData = await $fetch<{ token: string; revoked_at: string | null }>(`/api/switches/${swId}/public-token`, { method: 'POST' })
          }
        }

        if (tokenData?.token && !tokenData.revoked_at) {
          result.push({
            id: sw.id,
            name: sw.name,
            model: [sw.manufacturer, sw.model].filter(Boolean).join(' ') || undefined,
            location: sw.location,
            url: `${window.location.origin}/p/${tokenData.token}`,
            token: tokenData.token
          })
        }
      } catch (error: unknown) {
        const access = await handleInfrastructureForbidden(error)
        if (!canEditInfrastructure.value || access === 'demoted' || access === 'already-handled') {
          if (!unavailableSwitches.value.includes(sw.name)) unavailableSwitches.value.push(sw.name)
        }
      }
    }

    stickers.value = result
  } finally {
    loading.value = false
  }

  // Render QR codes after DOM update.
  // 300px canvas ≈ 300 dpi at the 26mm physical print size.
  await nextTick()
  for (const sticker of stickers.value) {
    const canvas = canvasRefs.get(sticker.id)
    if (canvas) {
      await QRCode.toCanvas(canvas, sticker.url, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
    }
  }
})

function onPrint() {
  if (stickers.value.length === 0) return
  window.print()
}

function onClose() {
  window.close()
}
</script>

<style scoped>
.print-preview {
  background: #fff;
  color: #000;
  min-height: 100vh;
  padding: 16px;
}

.toolbar {
  color: #333;
}

.toolbar-count {
  color: #888;
}

.muted {
  color: #999;
}

/* Scroll container: sheet keeps physical A4 width on any viewport. */
.sheet-scroll {
  overflow-x: auto;
}

/* A4 sheet: 210mm wide, 3 columns × 70mm = exact label pitch, no gap. */
.sheet {
  display: grid;
  grid-template-columns: repeat(3, 70mm);
  grid-auto-rows: 37mm;
  gap: 0;
  width: 210mm;
}

.sticker-cell {
  box-sizing: border-box;
  width: 70mm;
  height: 37mm;
  border: 1px dashed #bbb;
  padding: 2mm;
  display: flex;
  align-items: center;
  gap: 2mm;
  overflow: hidden;
  break-inside: avoid;
}

.sticker-qr {
  width: 26mm !important;
  height: 26mm !important;
  flex-shrink: 0;
}

.sticker-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.sticker-name {
  font-size: 10pt;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticker-model {
  font-size: 8pt;
  color: #555;
  margin-top: 1mm;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticker-location {
  font-size: 8pt;
  color: #777;
  margin-top: 0.5mm;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media print {
  .toolbar {
    display: none;
  }

  .print-preview {
    padding: 0;
    min-height: auto;
  }

  .sheet-scroll {
    overflow: visible;
  }
}

/* A4 portrait, zero page margins so the 3 × 8 grid lands exactly on the
   label sheet (printer driver scaling off / 100%). */
@page {
  size: A4 portrait;
  margin: 0;
}
</style>
