<template>
  <div class="print-preview" style="background: #fff; color: #000; min-height: 100vh; padding: 16px;">
    <!-- Toolbar (hidden in print) -->
    <div class="mb-4 flex items-center gap-3" style="color: #333;">
      <UButton icon="i-heroicons-x-mark" variant="ghost" size="sm" @click="onClose">
        {{ $t('common.close') }}
      </UButton>
      <span class="text-sm" style="color: #888;">
        {{ stickers.length }} {{ stickers.length === 1 ? 'QR Sticker' : 'QR Stickers' }}
      </span>
      <UButton icon="i-heroicons-printer" size="sm" @click="onPrint">
        {{ $t('common.print') }}
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="text-sm" style="color: #999;">Loading...</div>
    </div>

    <!-- No switches -->
    <div v-else-if="stickers.length === 0" class="py-12 text-center" style="color: #999;">
      No switches with public QR codes found.
    </div>

    <!-- Sticker grid: 3 columns for label sheets -->
    <div v-else class="sticker-grid">
      <div
        v-for="sticker in stickers"
        :key="sticker.id"
        class="sticker-cell"
      >
        <div class="sticker-inner">
          <canvas :ref="(el) => setCanvasRef(sticker.id, el as HTMLCanvasElement)" class="sticker-qr" />
          <div class="sticker-info">
            <div class="sticker-name">{{ sticker.name }}</div>
            <div v-if="sticker.model" class="sticker-model">{{ sticker.model }}</div>
            <div v-if="sticker.location" class="sticker-location">{{ sticker.location }}</div>
            <div class="sticker-brand">ezSWM</div>
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
const loading = ref(true)
const canvasRefs = new Map<string, HTMLCanvasElement>()

function setCanvasRef(id: string, el: HTMLCanvasElement | null) {
  if (el) canvasRefs.set(id, el)
}

onMounted(async () => {
  try {
    // Fetch switches (API returns { data: [...] } envelope)
    const switchesRes = await $fetch<{ data: { id: string; name: string; model?: string; location?: string; manufacturer?: string }[] }>('/api/switches', {
      params: { per_page: 1000 }
    })
    const switchList = switchesRes?.data || []

    const result: Sticker[] = []
    for (const swId of ids.value) {
      const sw = switchList.find(s => s.id === swId)
      if (!sw) continue

      try {
        // Try to get existing token
        let tokenData: { token: string; revoked_at: string | null }
        try {
          tokenData = await $fetch<{ token: string; revoked_at: string | null }>(`/api/switches/${swId}/public-token`)
        } catch {
          // No token yet — create one automatically
          tokenData = await $fetch<{ token: string; revoked_at: string | null }>(`/api/switches/${swId}/public-token`, { method: 'POST' })
        }

        if (tokenData && !tokenData.revoked_at) {
          result.push({
            id: sw.id,
            name: sw.name,
            model: [sw.manufacturer, sw.model].filter(Boolean).join(' ') || undefined,
            location: sw.location,
            url: `${window.location.origin}/p/${tokenData.token}`,
            token: tokenData.token
          })
        } else if (tokenData?.revoked_at) {
          // Token was revoked — create a new one
          const newToken = await $fetch<{ token: string; revoked_at: string | null }>(`/api/switches/${swId}/public-token`, { method: 'POST' })
          result.push({
            id: sw.id,
            name: sw.name,
            model: [sw.manufacturer, sw.model].filter(Boolean).join(' ') || undefined,
            location: sw.location,
            url: `${window.location.origin}/p/${newToken.token}`,
            token: newToken.token
          })
        }
      } catch {
        // Failed to get or create token — skip this switch
      }
    }

    stickers.value = result
  } finally {
    loading.value = false
  }

  // Render QR codes after DOM update
  await nextTick()
  for (const sticker of stickers.value) {
    const canvas = canvasRefs.get(sticker.id)
    if (canvas) {
      await QRCode.toCanvas(canvas, sticker.url, {
        width: 150,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
    }
  }
})

function onPrint() {
  window.print()
}

function onClose() {
  window.close()
}
</script>

<style scoped>
.sticker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sticker-cell {
  border: 1px dashed #ccc;
  border-radius: 4px;
  padding: 8px;
  break-inside: avoid;
}

.sticker-inner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sticker-qr {
  width: 80px !important;
  height: 80px !important;
  flex-shrink: 0;
}

.sticker-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.sticker-name {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticker-model {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticker-location {
  font-size: 10px;
  color: #888;
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticker-brand {
  font-size: 8px;
  color: #bbb;
  margin-top: 4px;
}

@media print {
  .sticker-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .sticker-cell {
    border: 1px dashed #ddd;
    padding: 6px;
  }

  .sticker-qr {
    width: 70px !important;
    height: 70px !important;
  }
}
</style>
