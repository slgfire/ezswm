<template>
  <div class="space-y-3">
    <!-- Port cards -->
    <div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3">
      <div
        v-for="socket in sortedSockets"
        :key="socket.port_number"
        class="rounded-lg border bg-[#161616] p-3"
        :class="cardBorderClass(socket)"
      >
        <!-- Row 1: port number + side badge + tested badge -->
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-bold text-gray-200">{{ socket.port_number }}</span>
          <div class="flex items-center gap-1.5">
            <span
              v-if="socket.side"
              class="shrink-0 rounded-full bg-primary-500/20 px-2 py-0.5 text-[10px] font-semibold text-primary-400"
            >{{ socket.side }}</span>
            <span
              v-if="socket.tested"
              class="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
            >{{ $t('patchPanels.tested') }}</span>
          </div>
        </div>

        <!-- Row 2: outlet number or "free" -->
        <div class="mt-1 text-sm font-medium" :class="isOccupied(socket) ? 'text-gray-300' : 'text-gray-500'">
          {{ socket.outlet_number || $t('public.pp.free') }}
        </div>

        <!-- Row 3: location -->
        <div v-if="socket.location" class="mt-0.5 text-[11px] text-gray-500">
          {{ socket.location }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Sanitized public socket — mirrors API allow-list, no internal fields. */
interface PublicPatchSocket {
  port_number: number
  outlet_number?: string
  location?: string
  side?: 'L' | 'R'
  tested: boolean
}

const props = defineProps<{
  sockets: PublicPatchSocket[]
}>()

const sortedSockets = computed(() =>
  [...props.sockets].sort((a, b) => a.port_number - b.port_number)
)

function isOccupied(socket: PublicPatchSocket): boolean {
  return !!(socket.outlet_number || socket.location)
}

function cardBorderClass(socket: PublicPatchSocket): string {
  if (socket.tested && isOccupied(socket)) return 'border-emerald-500/30'
  if (isOccupied(socket)) return 'border-primary-500/30'
  if (socket.tested) return 'border-amber-500/30'
  return 'border-gray-700/50'
}
</script>
