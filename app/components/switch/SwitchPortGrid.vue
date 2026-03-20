<template>
  <div class="space-y-4">
    <!-- Block-based rendering -->
    <template v-if="units && units.length">
      <div v-for="(unit, ui) in units" :key="unit.unit_number">
        <SwitchUnitDivider :label="unit.label || `Unit ${unit.unit_number}`" />
        <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/30">
          <div class="flex flex-wrap items-start gap-5">
            <div v-for="block in unit.blocks" :key="block.id" class="flex flex-col gap-1">
              <div v-if="block.label" class="text-[10px] font-medium text-gray-400 dark:text-gray-500">{{ block.label }}</div>
            <!-- Multi-row block with layout modes -->
            <div
              v-if="block.rows >= 2"
              class="flex flex-col"
              :class="needsExtraBottomSpace(block) ? 'gap-3' : 'gap-1.5'"
            >
              <div
                v-for="(row, ri) in getRowsForBlock(unit.unit_number, block)"
                :key="ri"
                class="flex gap-2"
              >
                <SwitchPortItem
                  v-for="port in row"
                  :key="port.id"
                  :port="port"
                  :vlans="vlans"
                  :selected="selectedPorts.includes(port.id)"
                  @click="onPortClick($event, port.id)"
                />
              </div>
            </div>
            <!-- Single-row block -->
            <div v-else class="flex gap-2" :class="needsExtraBottomSpace(block) ? 'pb-4' : ''">
              <SwitchPortItem
                v-for="port in getPortsForBlock(unit.unit_number, block)"
                :key="port.id"
                :port="port"
                :vlans="vlans"
                :selected="selectedPorts.includes(port.id)"
                @click="onPortClick($event, port.id)"
              />
            </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Fallback flat grid -->
    <div v-else class="flex flex-wrap gap-2">
      <SwitchPortItem
        v-for="port in ports"
        :key="port.id"
        :port="port"
        :vlans="vlans"
        :selected="selectedPorts.includes(port.id)"
        @click="onPortClick($event, port.id)"
      />
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-gray-200 pt-3 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
      <!-- Status -->
      <span class="font-semibold text-gray-600 dark:text-gray-300">{{ $t('legend.status') }}:</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded border border-green-400 bg-green-50 dark:bg-gray-700" /> {{ $t('legend.up') }}</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800" /> {{ $t('legend.down') }}</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded border border-red-300 bg-red-50 dark:bg-gray-800" /> {{ $t('legend.disabled') }}</span>

      <span class="text-gray-300 dark:text-gray-600">|</span>

      <!-- Port types -->
      <span class="font-semibold text-gray-600 dark:text-gray-300">{{ $t('legend.type') }}:</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-1 rounded-sm bg-sky-400" /> {{ $t('legend.sfp') }}</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-1 rounded-sm bg-violet-400" /> {{ $t('legend.qsfp') }}</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-1 rounded-sm bg-amber-400" /> {{ $t('legend.console') }}</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-1 rounded-sm bg-teal-400" /> {{ $t('legend.mgmt') }}</span>

      <span class="text-gray-300 dark:text-gray-600">|</span>

      <!-- Indicators -->
      <span class="font-semibold text-gray-600 dark:text-gray-300">{{ $t('legend.indicators') }}:</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-gray-400" /> Access</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" /> Trunk</span>
      <template v-if="vlans && vlans.length">
        <template v-for="vlan in usedVlans" :key="vlan.vlan_id">
          <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ backgroundColor: vlan.color }" /> VLAN {{ vlan.vlan_id }}</span>
        </template>
      </template>

      <span class="text-gray-300 dark:text-gray-600">|</span>

      <span class="flex items-center gap-1 text-gray-400">
        <UIcon name="i-heroicons-cursor-arrow-ripple" class="h-3 w-3" />
        {{ $t('switches.ports.multiSelectHint') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  ports: any[]
  units?: any[]
  vlans?: any[]
  selectedPorts: string[]
}>()

const emit = defineEmits<{
  'select-port': [portId: string]
  'toggle-select': [portId: string]
}>()

function onPortClick(event: MouseEvent, portId: string) {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    emit('toggle-select', portId)
  } else {
    emit('select-port', portId)
  }
}

function getPortsForBlock(unitNumber: number, block: any) {
  return props.ports
    .filter(p => p.unit === unitNumber && p.index >= block.start_index && p.index < block.start_index + block.count)
    .sort((a, b) => a.index - b.index)
}

function getRowsForBlock(unitNumber: number, block: any): any[][] {
  const ports = getPortsForBlock(unitNumber, block)
  if (ports.length === 0) return []

  const rows = block.rows || 2
  const mode = block.row_layout || 'sequential'
  const startIdx = block.start_index || 0

  if (mode === 'odd-even') {
    // Use relative position in block: first port = position 0
    const topRow = ports.filter((_, i) => i % 2 === 0)
    const bottomRow = ports.filter((_, i) => i % 2 === 1)
    return [topRow, bottomRow]
  }

  if (mode === 'even-odd') {
    const topRow = ports.filter((_, i) => i % 2 === 1)
    const bottomRow = ports.filter((_, i) => i % 2 === 0)
    return [topRow, bottomRow]
  }

  // Sequential: split into N rows of equal size
  const perRow = Math.ceil(ports.length / rows)
  const result: any[][] = []
  for (let r = 0; r < rows; r++) {
    result.push(ports.slice(r * perRow, (r + 1) * perRow))
  }
  return result
}

function needsExtraBottomSpace(_block: any): boolean {
  return false
}

// VLANs actually used on ports (for legend)
const usedVlans = computed(() => {
  if (!props.vlans?.length) return []
  const usedIds = new Set<number>()
  for (const p of props.ports) {
    if (p.native_vlan) usedIds.add(p.native_vlan)
  }
  return props.vlans.filter(v => usedIds.has(v.vlan_id) && v.color)
})
</script>
