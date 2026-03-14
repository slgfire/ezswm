<script setup lang="ts">
import type { LayoutBlockType, LayoutTemplate } from '~/types/models'

const props = defineProps<{ initial?: Partial<LayoutTemplate> }>()
const emit = defineEmits<{ submit: [Partial<LayoutTemplate>] }>()

const blockTypeOptions: LayoutBlockType[] = ['rj45', 'sfp', 'sfp+', 'qsfp', 'mgmt']

const form = reactive<Partial<LayoutTemplate>>({
  name: props.initial?.name || '',
  description: props.initial?.description || '',
  rows: props.initial?.rows || 2,
  cols: props.initial?.cols || 24,
  type: props.initial?.type || 'custom',
  cells: props.initial?.cells || [],
  blocks: props.initial?.blocks || []
})

function generateGridMapping() {
  const cells = []
  let p = 1
  for (let row = 1; row <= (form.rows || 0); row++) {
    for (let col = 1; col <= (form.cols || 0); col++) {
      cells.push({ row, col, portNumber: p++ })
    }
  }
  form.cells = cells
}

function addBlock() {
  const blocks = form.blocks || []
  blocks.push({
    id: `block-${Date.now()}-${blocks.length + 1}`,
    name: `Block ${blocks.length + 1}`,
    type: 'rj45',
    rows: 1,
    columns: 8,
    startPort: 1,
    endPort: 8
  })
  form.blocks = blocks
}


function parsePorts(value: string): number[] {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

function stringifyPorts(value?: number[]): string {
  return (value || []).join(', ')
}

function updateBlockPorts(block: NonNullable<LayoutTemplate['blocks']>[number], event: Event) {
  const target = event.target as HTMLInputElement | null
  block.ports = parsePorts(target?.value || '')
}

function removeBlock(index: number) {
  if (!form.blocks) return
  form.blocks.splice(index, 1)
}
</script>

<template>
  <form class="panel stack" @submit.prevent="emit('submit', form)">
    <h3>Edit layout</h3>
    <div class="network-form-grid">
      <input v-model="form.name" placeholder="Name" required>
      <input v-model="form.description" placeholder="Description">
      <input v-model.number="form.rows" type="number" min="1" placeholder="Rows" required>
      <input v-model.number="form.cols" type="number" min="1" placeholder="Cols" required>
      <select v-model="form.type">
        <option value="sequential">sequential</option>
        <option value="odd-even">odd-even</option>
        <option value="custom">custom</option>
      </select>
    </div>

    <div class="row">
      <UButton type="button" color="neutral" variant="soft" label="Auto mapping" @click="generateGridMapping" />
      <UButton type="button" color="neutral" variant="soft" icon="i-lucide-plus" label="Add block" @click="addBlock" />
      <UButton type="submit" icon="i-lucide-save" label="Save" />
    </div>

    <div class="stack">
      <h4>Port blocks</h4>
      <UCard v-for="(block, index) in form.blocks || []" :key="block.id" class="stack">
        <div class="network-form-grid">
          <input v-model="block.id" placeholder="Block ID" required>
          <input v-model="block.name" placeholder="Block name" required>
          <select v-model="block.type">
            <option v-for="type in blockTypeOptions" :key="type" :value="type">{{ type }}</option>
          </select>
          <input v-model.number="block.rows" type="number" min="1" placeholder="Rows" required>
          <input v-model.number="block.columns" type="number" min="1" placeholder="Columns" required>
          <input v-model.number="block.startPort" type="number" min="1" placeholder="Start port">
          <input v-model.number="block.endPort" type="number" min="1" placeholder="End port">
          <input :value="stringifyPorts(block.ports || block.portNumbers)" placeholder="Explicit ports (1,2,3)" @input="updateBlockPorts(block, $event)">
        </div>
        <div class="row row-end">
          <UButton type="button" color="error" variant="soft" label="Remove block" @click="removeBlock(index)" />
        </div>
      </UCard>
      <small>Current cells: {{ form.cells?.length || 0 }}</small>
    </div>
  </form>
</template>
