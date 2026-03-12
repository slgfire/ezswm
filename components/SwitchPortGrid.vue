<script setup lang="ts">
import type { LayoutTemplate, Port } from '~/types/models'

const props = defineProps<{ layout: LayoutTemplate; ports: Port[]; selectedPortNumber?: number }>()
const emit = defineEmits<{ select: [Port | undefined, number] }>()

const map = computed(() => {
  const m = new Map<number, Port>()
  props.ports.forEach((p) => m.set(p.portNumber, p))
  return m
})

function cls(status?: string) {
  if (status === 'used') return 'port-used'
  if (status === 'disabled') return 'port-disabled'
  if (status === 'error') return 'port-error'
  return 'port-free'
}

function selectPort(portNumber: number) {
  emit('select', map.value.get(portNumber), portNumber)
}
</script>

<template>
  <div class="grid" :style="{ gridTemplateColumns: `repeat(${layout.cols}, minmax(36px, 1fr))` }">
    <button
      v-for="cell in layout.cells"
      :key="`${cell.row}-${cell.col}`"
      :style="{ gridColumn: String(cell.col), gridRow: String(cell.row) }"
      :class="['port-cell', cls(map.get(cell.portNumber)?.status), { 'port-selected': selectedPortNumber === cell.portNumber }]"
      :aria-label="`Port ${cell.portNumber}: ${map.get(cell.portNumber)?.status || 'free'}`"
      @click="selectPort(cell.portNumber)"
    >
      <div>P{{ cell.portNumber }}</div>
      <small>{{ map.get(cell.portNumber)?.label || cell.label || '-' }}</small>
    </button>
  </div>
</template>
