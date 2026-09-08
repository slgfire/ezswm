<template>
  <ClientOnly>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="flex min-h-[60vh] items-center justify-center">
      <div class="text-center text-gray-500">
        <UIcon name="i-heroicons-arrow-path" class="mb-2 h-8 w-8 animate-spin" />
        <p class="text-sm">{{ $t('public.pp.loading') }}</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex min-h-[60vh] items-center justify-center">
      <div class="text-center text-gray-500">
        <UIcon name="i-heroicons-exclamation-circle" class="mb-2 h-12 w-12 text-gray-600" />
        <p class="text-sm">{{ $t('public.error') }}</p>
      </div>
    </div>

    <!-- Success -->
    <div v-else-if="data" class="space-y-4">
      <!-- Header -->
      <div class="text-center">
        <div class="text-[10px] uppercase tracking-widest text-gray-600">ezSWM</div>
        <h1 class="mt-1 text-xl font-bold text-gray-100">{{ data.name }}</h1>
      </div>

      <!-- KPI strip -->
      <div class="flex items-center justify-center gap-4 text-xs text-gray-400">
        <span>{{ portCount }} {{ $t('patchPanels.ports') }}</span>
        <span class="text-gray-600">·</span>
        <span>{{ occupiedCount }} {{ $t('patchPanels.occupied') }}</span>
        <span class="text-gray-600">·</span>
        <span>{{ testedCount }} {{ $t('patchPanels.tested').toLowerCase() }}</span>
      </div>

      <!-- Visual port overview (read-only, same state colors) -->
      <div class="overflow-x-auto rounded-lg border border-gray-800 bg-[#111] p-3">
        <div class="flex flex-wrap items-start gap-1.5 justify-center">
          <div
            v-for="portNum in portCount"
            :key="portNum"
            class="flex flex-col items-center gap-0.5"
          >
            <div
              class="relative flex h-10 w-10 flex-col items-center justify-center rounded border font-mono text-xs font-semibold leading-none"
              :class="portCellClass(portNum)"
            >
              <span>{{ portNum }}</span>
              <span
                v-if="getSocket(portNum)?.side"
                class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[8px] font-bold text-white"
              >{{ getSocket(portNum)!.side }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Port list -->
      <PatchPanelPublicPortList :sockets="data.sockets" />

      <!-- Footer -->
      <div class="border-t border-gray-800 pt-4 text-center text-[10px] text-gray-600">
        <div>{{ $t('public.footer') }}</div>
      </div>
    </div>
  </div>
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'public' })

/** Sanitized public socket — mirrors API allow-list, no internal fields. */
interface PublicPatchSocket {
  port_number: number
  outlet_number?: string
  location?: string
  side?: 'L' | 'R'
  tested: boolean
}

/** Strict public API contract: { name, sockets[] } */
interface PublicPatchPanelPayload {
  name: string
  sockets: PublicPatchSocket[]
}

const route = useRoute()
const tokenStr = route.params.token as string

useHead({ title: 'Patch Panel' })

const { data, pending, error } = useFetch<PublicPatchPanelPayload>(`/api/p/pp/${tokenStr}`, { server: false })

const socketMap = computed(() => {
  const map = new Map<number, PublicPatchSocket>()
  if (!data.value) return map
  for (const s of data.value.sockets) {
    map.set(s.port_number, s)
  }
  return map
})

function getSocket(portNum: number): PublicPatchSocket | undefined {
  return socketMap.value.get(portNum)
}

function isOccupied(socket: PublicPatchSocket | undefined): boolean {
  return !!(socket?.outlet_number || socket?.location)
}

// Derive port count from the highest socket port_number (no port_count in API contract)
const portCount = computed(() => {
  if (!data.value?.sockets.length) return 0
  return Math.max(...data.value.sockets.map(s => s.port_number))
})

const occupiedCount = computed(() => {
  if (!data.value) return 0
  return data.value.sockets.filter(s => isOccupied(s)).length
})

const testedCount = computed(() => {
  if (!data.value) return 0
  return data.value.sockets.filter(s => s.tested).length
})

function portCellClass(portNum: number): string {
  const socket = getSocket(portNum)
  if (!socket) return 'border-dashed border-gray-700 bg-gray-900 text-gray-600'
  if (socket.tested && isOccupied(socket)) {
    return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
  }
  if (isOccupied(socket)) {
    return 'border-primary-500/50 bg-primary-500/10 text-primary-400'
  }
  if (socket.tested) {
    return 'border-amber-500/50 bg-amber-500/10 text-amber-400'
  }
  return 'border-dashed border-gray-700 bg-gray-900 text-gray-600'
}
</script>
