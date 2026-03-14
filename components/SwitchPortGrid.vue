<script setup lang="ts">
import type { LayoutBlock, LayoutTemplate, Port } from '~/types/models'

const props = defineProps<{ layout: LayoutTemplate; ports: Port[]; selectedPortNumber?: number }>()
const emit = defineEmits<{ select: [Port | undefined, number] }>()

interface RenderedBlock extends LayoutBlock {
  portNumbers: number[]
  slots: Array<number | null>
}

const map = computed(() => {
  const m = new Map<number, Port>()
  props.ports.forEach((p) => m.set(p.portNumber, p))
  return m
})

const hasBlocks = computed(() => Boolean(props.layout.blocks?.length))

const renderedBlocks = computed<RenderedBlock[]>(() => {
  if (!hasBlocks.value) return []

  return (props.layout.blocks || [])
    .map((block) => {
      const portNumbers = resolveBlockPorts(block)
      const requiredSlots = Math.max(block.rows * block.columns, portNumbers.length)
      const slots = Array.from({ length: requiredSlots }, (_, index) => portNumbers[index] ?? null)
      return {
        ...block,
        portNumbers,
        slots
      }
    })
    .filter((block) => block.portNumbers.length > 0)
})

function resolveBlockPorts(block: LayoutBlock): number[] {
  if (block.portNumbers?.length) {
    return [...block.portNumbers]
  }

  if (block.ports?.length) {
    return [...block.ports]
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

function mediaClass(blockType: LayoutBlock['type'], portNumber: number) {
  const media = map.value.get(portNumber)?.mediaType?.toLowerCase()
  if (media) return `port-cell--${media.replace('+', 'plus')}`
  return `port-cell--${blockType.replace('+', 'plus')}`
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
      :class="`port-block--${block.type.replace('+', 'plus')}`"
    >
      <div class="port-block__header">
        <div>
          <h4>{{ block.name }}</h4>
          <small>{{ block.type.toUpperCase() }}</small>
        </div>
        <UBadge color="neutral" variant="subtle">{{ block.portNumbers.length }} ports</UBadge>
      </div>

      <div class="grid" :style="{ gridTemplateColumns: `repeat(${block.columns}, minmax(36px, 1fr))` }">
        <template v-for="(slotPort, slotIndex) in block.slots" :key="`${block.id}-${slotIndex}`">
          <button
            v-if="slotPort"
            :class="['port-cell', cls(map.get(slotPort)?.status), mediaClass(block.type, slotPort), { 'port-selected': selectedPortNumber === slotPort }]"
            :aria-label="`Port ${slotPort}: ${map.get(slotPort)?.status || 'free'}`"
            @click="selectPort(slotPort)"
          >
            <div>P{{ slotPort }}</div>
            <small>{{ map.get(slotPort)?.label || '-' }}</small>
          </button>
          <div v-else class="port-cell port-cell--empty" aria-hidden="true" />
        </template>
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
