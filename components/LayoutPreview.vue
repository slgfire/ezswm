<script setup lang="ts">
import type { LayoutTemplate } from '~/types/models'
defineProps<{ layout: LayoutTemplate }>()
</script>

<template>
  <div class="panel layout-preview stack">
    <h3>{{ layout.name }}</h3>
    <p>{{ layout.description }}</p>

    <div v-if="layout.blocks?.length" class="port-blocks">
      <UCard v-for="block in layout.blocks" :key="block.id" class="stack">
        <div class="row row-between">
          <strong>{{ block.name }}</strong>
          <UBadge color="neutral" variant="subtle">{{ block.type.toUpperCase() }}</UBadge>
        </div>
        <small>{{ block.rows }}x{{ block.columns }} · {{ block.startPort || '-' }} to {{ block.endPort || '-' }}</small>
      </UCard>
    </div>

    <div v-else class="grid" :style="{ gridTemplateColumns: `repeat(${layout.cols}, minmax(24px, 1fr))` }">
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
