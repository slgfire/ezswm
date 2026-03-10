<script setup lang="ts">
import type { LayoutTemplate } from '~/types/models'

const props = defineProps<{ initial?: Partial<LayoutTemplate> }>()
const emit = defineEmits<{ submit: [Partial<LayoutTemplate>] }>()

const form = reactive<Partial<LayoutTemplate>>({
  name: props.initial?.name || '',
  description: props.initial?.description || '',
  rows: props.initial?.rows || 2,
  cols: props.initial?.cols || 24,
  type: props.initial?.type || 'custom',
  cells: props.initial?.cells || []
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
</script>

<template>
  <form class="panel" @submit.prevent="emit('submit', form)">
    <h3>Layout bearbeiten</h3>
    <div class="row">
      <input v-model="form.name" placeholder="Name" required>
      <input v-model="form.description" placeholder="Beschreibung">
      <input v-model.number="form.rows" type="number" min="1" placeholder="Rows" required>
      <input v-model.number="form.cols" type="number" min="1" placeholder="Cols" required>
      <select v-model="form.type">
        <option value="sequential">sequential</option>
        <option value="odd-even">odd-even</option>
        <option value="custom">custom</option>
      </select>
      <button type="button" class="secondary" @click="generateGridMapping">Auto-Mapping</button>
      <button type="submit">Speichern</button>
    </div>
    <p>Aktuelle Zellen: {{ form.cells?.length || 0 }}</p>
  </form>
</template>
