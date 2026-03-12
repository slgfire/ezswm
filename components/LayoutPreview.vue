<script setup lang="ts">
import type { LayoutTemplate } from '~/types/models'
defineProps<{ layout: LayoutTemplate }>()
</script>

<template>
  <div class="panel layout-preview">
    <h3>{{ layout.name }}</h3>
    <p>{{ layout.description }}</p>
    <div class="grid" :style="{ gridTemplateColumns: `repeat(${layout.cols}, minmax(24px, 1fr))` }">
      <div
        v-for="cell in layout.cells"
        :key="`${cell.row}-${cell.col}`"
        class="port-cell"
        :style="{ gridColumn: String(cell.col), gridRow: String(cell.row) }"
      >
        {{ cell.portNumber }}
      </div>
    </div>
  </div>
</template>
