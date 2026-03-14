<script setup lang="ts">
import type { LayoutBlock, LayoutTemplate, Port } from '~/types/models'

const props = defineProps<{ layout: LayoutTemplate; ports: Port[]; selectedPortNumber?: number }>()
const emit = defineEmits<{ select: [Port | undefined, number] }>()

const map = computed(() => {
  const m = new Map<number, Port>()
  props.ports.forEach((p) => m.set(p.portNumber, p))
  return m
})

const hasBlocks = computed(() => Boolean(props.layout.blocks?.length))

const renderedBlocks = computed(() => {
  if (!hasBlocks.value) return []

  return (props.layout.blocks || [])
    .map((block) => {
      const portNumbers = resolveBlockPorts(block)
      return {
        ...block,
        portNumbers
      }
    })
    .filter((block) => block.portNumbers.length > 0)
})

function resolveBlockPorts(block: LayoutBlock): number[] {
  if (block.portNumbers?.length) {
    return block.portNumbers
  }

  if (typeof block.startPort === 'number' && typeof block.endPort === 'number') {
    const [start, end] = block.startPort <= block.endPort
      ? [block.startPort, block.endPort]
      : [block.endPort, block.startPort]

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }

  return []
}

function cls(status?: string) {
  if (status === 'used') return 'port-used'
  if (status === 'disabled') return 'port-disabled'
  if (status === 'error') return 'port-error'
  return 'port-free'
}

function typeClass(type: LayoutBlock['type']) {
  return `port-block--${type.replace('+', 'plus')}`
}

function selectPort(portNumber: number) {
  emit('select', map.value.get(portNumber), portNumber)
}
</script>

<template>
  <div v-if="hasBlocks" class="port-blocks">
    <section
      v-for="block in renderedBlocks"
      :key="block.id"
      class="panel port-block"
      :class="typeClass(block.type)"
    >
      <div class="port-block__header">
        <div>
          <h4>{{ block.name }}</h4>
          <small>{{ block.type.toUpperCase() }}</small>
        </div>
        <UBadge color="neutral" variant="subtle">{{ block.portNumbers.length }} ports</UBadge>
      </div>

      <div class="grid" :style="{ gridTemplateColumns: `repeat(${block.columns}, minmax(36px, 1fr))` }">
        <button
          v-for="portNumber in block.portNumbers"
          :key="`${block.id}-${portNumber}`"
          :class="['port-cell', cls(map.get(portNumber)?.status), { 'port-selected': selectedPortNumber === portNumber }]"
          :aria-label="`Port ${portNumber}: ${map.get(portNumber)?.status || 'free'}`"
          @click="selectPort(portNumber)"
        >
          <div>P{{ portNumber }}</div>
          <small>{{ map.get(portNumber)?.label || '-' }}</small>
        </button>
      </div>
    </section>
  </div>

  <div v-else class="grid" :style="{ gridTemplateColumns: `repeat(${layout.cols}, minmax(36px, 1fr))` }">
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
