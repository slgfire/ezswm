<template>
  <div class="flex flex-col gap-1.5">
    <div v-for="unit in template.units" :key="unit.unit_number">
      <div v-if="template.units.length > 1" class="mb-1 text-[9px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {{ unit.label || `Unit ${unit.unit_number}` }}
      </div>
      <div class="flex flex-wrap items-start gap-2">
        <div v-for="(block, bi) in unit.blocks" :key="bi" class="flex flex-col gap-0.5">
          <div
            v-for="(row, ri) in getRows(block)"
            :key="ri"
            class="flex gap-px"
          >
            <div
              v-for="(_, pi) in row"
              :key="pi"
              class="rounded-sm"
              :class="portClasses(block.type)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LayoutTemplate, LayoutBlock } from '~/types/layoutTemplate'

defineProps<{
  template: LayoutTemplate
}>()

function getRows(block: LayoutBlock): number[][] {
  const rows = Math.max(block.rows || 1, 1)
  const perRow = Math.ceil(block.count / rows)
  const result: number[][] = []
  let remaining = block.count
  for (let r = 0; r < rows; r++) {
    const count = Math.min(perRow, remaining)
    result.push(new Array(count).fill(0))
    remaining -= count
  }
  return result
}

function portClasses(type: string): string {
  const size = type === 'qsfp' ? 'h-2 w-3' : type === 'sfp' || type === 'sfp+' ? 'h-2 w-1.5' : 'h-2 w-2'
  const colorMap: Record<string, string> = {
    rj45: 'bg-blue-400/70 dark:bg-blue-500/50',
    sfp: 'bg-sky-400/70 dark:bg-sky-500/50',
    'sfp+': 'bg-violet-400/70 dark:bg-violet-500/50',
    qsfp: 'bg-purple-400/70 dark:bg-purple-500/50',
    console: 'bg-amber-400/70 dark:bg-amber-500/50',
    management: 'bg-teal-400/70 dark:bg-teal-500/50'
  }
  return `${size} ${colorMap[type] || 'bg-neutral-400/70 dark:bg-neutral-500/50'}`
}
</script>
