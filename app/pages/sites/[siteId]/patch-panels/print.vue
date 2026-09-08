<template>
  <div class="print-preview" style="background: #fff; color: #000; min-height: 100vh; padding: 16px;">
    <!-- Toolbar -->
    <div class="mb-4 flex items-center gap-3" style="color: #333;">
      <UButton icon="i-heroicons-x-mark" variant="ghost" size="sm" @click="onClose">
        {{ $t('common.close') }}
      </UButton>
      <span class="text-sm" style="color: #888;">
        {{ panels.length }} {{ $t('patchPanels.title') }}
      </span>
      <UButton icon="i-heroicons-printer" size="sm" @click="onPrint">
        {{ $t('common.print') }}
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="text-sm" style="color: #999;">Loading...</div>
    </div>

    <!-- No panels -->
    <div v-else-if="panels.length === 0" class="py-12 text-center" style="color: #999;">
      {{ $t('patchPanels.noResults') }}
    </div>

    <!-- Each panel -->
    <div
      v-for="(panel, idx) in panels"
      :key="panel.id"
      :class="idx < panels.length - 1 ? 'print-page-break mb-8' : ''"
    >
      <div class="mb-1 font-bold" style="font-size: 14px; color: #000;">{{ panel.name }}</div>
      <p v-if="panel.description" class="mb-2 text-xs" style="color: #666;">{{ panel.description }}</p>

      <!-- Port grid: one cell per port, compact -->
      <div class="mb-2 flex flex-wrap gap-1">
        <div
          v-for="portNum in panel.port_count"
          :key="portNum"
          class="pp-print-cell"
          :class="ppCellClass(panel, portNum)"
        >
          <span class="pp-print-num">{{ portNum }}</span>
          <span v-if="getSocket(panel, portNum)?.outlet_number" class="pp-print-outlet">
            {{ getSocket(panel, portNum)!.outlet_number }}
          </span>
          <span v-if="getSocket(panel, portNum)?.location" class="pp-print-loc">
            {{ getSocket(panel, portNum)!.location }}
          </span>
          <span v-if="getSocket(panel, portNum)?.side" class="pp-print-side">
            {{ getSocket(panel, portNum)!.side }}
          </span>
        </div>
      </div>

      <!-- Summary line -->
      <div class="text-[9px]" style="color: #888;">
        {{ panel.port_count }} {{ $t('patchPanels.ports') }} ·
        {{ occupiedCount(panel) }} {{ $t('patchPanels.occupied') }} ·
        {{ testedCount(panel) }} {{ $t('patchPanels.tested').toLowerCase() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PatchPanel, PatchPanelSocket } from '~~/types/patchPanel'

definePageMeta({ layout: 'print' })

const route = useRoute()
const siteId = route.params.siteId as string

const ids = computed(() => {
  const q = route.query.ids as string
  if (!q) return []
  return [...new Set(q.split(',').filter(Boolean))]
})

const loading = ref(true)
const panels = ref<PatchPanel[]>([])

useHead({ title: 'Print — ezSWM', titleTemplate: '' })

function onClose() { window.close() }
function onPrint() { document.body.classList.add('print-mode'); window.print() }
function onAfterPrint() { document.body.classList.remove('print-mode') }

async function fetchData() {
  if (ids.value.length === 0) { loading.value = false; return }
  loading.value = true
  try {
    const params = siteId !== 'all' ? { site_id: siteId } : {}
    const data = await $fetch<{ data?: PatchPanel[] }>('/api/patch-panels', { params })
    const all = data?.data || []
    panels.value = ids.value
      .map(id => all.find(p => p.id === id))
      .filter((p): p is PatchPanel => !!p)
  } catch { /* silent */ } finally { loading.value = false }
}

const socketMaps = computed(() => {
  const maps = new Map<string, Map<number, PatchPanelSocket>>()
  for (const p of panels.value) {
    const m = new Map<number, PatchPanelSocket>()
    for (const s of p.sockets) m.set(s.port_number, s)
    maps.set(p.id, m)
  }
  return maps
})

function getSocket(panel: PatchPanel, portNum: number): PatchPanelSocket | undefined {
  return socketMaps.value.get(panel.id)?.get(portNum)
}

function isOccupied(s: PatchPanelSocket | undefined): boolean {
  return !!(s?.outlet_number || s?.location)
}

function occupiedCount(panel: PatchPanel): number {
  return panel.sockets.filter(s => isOccupied(s)).length
}

function testedCount(panel: PatchPanel): number {
  return panel.sockets.filter(s => s.tested).length
}

function ppCellClass(panel: PatchPanel, portNum: number): string {
  const s = getSocket(panel, portNum)
  if (!s) return 'pp-empty'
  if (s.tested && isOccupied(s)) return 'pp-tested-occupied'
  if (isOccupied(s)) return 'pp-occupied'
  if (s.tested) return 'pp-tested'
  return 'pp-empty'
}

onMounted(() => {
  document.body.classList.add('print-mode')
  window.addEventListener('afterprint', onAfterPrint)
  fetchData()
})

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', onAfterPrint)
  document.body.classList.remove('print-mode')
})
</script>

<style scoped>
.pp-print-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  min-height: 40px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 2px 1px;
  font-family: monospace;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.pp-print-num {
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}

.pp-print-outlet {
  font-size: 6px;
  line-height: 1.1;
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pp-print-loc {
  font-size: 5px;
  line-height: 1;
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
}

.pp-print-side {
  position: absolute;
  top: -1px;
  right: -1px;
  font-size: 5px;
  font-weight: 700;
  background: #333;
  color: #fff;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.pp-print-cell {
  position: relative;
}

/* State colors */
.pp-empty {
  border-style: dashed;
  border-color: #ddd;
  color: #aaa;
  background: #fafafa;
}

.pp-occupied {
  border-color: #6b8afd;
  background: #eef2ff;
  color: #3b5bdb;
}

.pp-tested-occupied {
  border-color: #40c057;
  background: #ebfbee;
  color: #2b8a3e;
}

.pp-tested {
  border-color: #fab005;
  background: #fff9db;
  color: #e67700;
}
</style>
