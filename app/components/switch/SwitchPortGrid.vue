<template>
  <div class="space-y-4">
    <!-- Block-based rendering -->
    <template v-if="units && units.length">
      <div v-for="(unit, ui) in units" :key="unit.unit_number">
        <!-- Stack member divider between stack members -->
        <div v-if="shouldShowMemberDivider(ui)" class="col-span-full my-2 flex items-center gap-2">
          <div class="h-px flex-1 bg-emerald-500/30"></div>
          <span class="text-xs text-emerald-400 font-medium">{{ $t('switches.stackMember', { n: getMemberNumber(ui) }) }}</span>
          <div class="h-px flex-1 bg-emerald-500/30"></div>
        </div>
        <SwitchUnitDivider :label="unit.label || `Unit ${unit.unit_number}`" />
        <div class="rounded-lg border border-default bg-default/30 p-3">
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
                  :lag-group="lagByPortId?.get(port.id)"
                  :dimmed="isDimmed(port.id)"
                  :print-mode="printMode"
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
                :lag-group="lagByPortId?.get(port.id)"
                :dimmed="isDimmed(port.id)"
                  :print-mode="printMode"
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
        :lag-group="lagByPortId?.get(port.id)"
        :dimmed="isDimmed(port.id)"
                  :print-mode="printMode"
        @click="onPortClick($event, port.id)"
      />
    </div>

    <!-- Legend -->
    <div class="port-legend flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-default pt-3 text-[11px] text-gray-500 dark:text-gray-400">
      <!-- Status -->
      <span class="font-semibold text-gray-600 dark:text-gray-300">{{ $t('legend.status') }}:</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded border border-green-400 bg-green-50 dark:bg-neutral-700" /> {{ $t('legend.up') }}</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded border border-gray-300 bg-gray-100 dark:border-neutral-600 dark:bg-neutral-800" /> {{ $t('legend.down') }}</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded border border-red-300 bg-red-50 dark:bg-neutral-800" /> {{ $t('legend.disabled') }}</span>

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
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 bg-gray-400" style="border-radius: 0" /> Access</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" style="box-shadow: 0 0 0 1.5px #0a0a0a, 0 0 0 2.5px #9ca3af" /> Trunk</span>
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

    <!-- LAG Legend -->
    <div v-if="lagGroups?.length" class="port-legend flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-default pt-3 text-[11px] text-gray-500 dark:text-gray-400">
      <span class="font-semibold text-gray-600 dark:text-gray-300">LAG:</span>

      <template v-for="lag in visibleLags" :key="lag.id">
        <div
          class="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 transition-all hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          @mouseenter="onLagHover(lag.id)"
          @mouseleave="onLagLeave()"
          @click="$emit('edit-lag', lag)"
        >
          <span class="lag-stripe-icon inline-block h-3 w-4 rounded-sm" />
          <span class="font-medium text-gray-700 dark:text-gray-200">{{ lag.name }}</span>
          <span class="text-gray-400">{{ lag.port_ids.length }}p</span>
          <span v-if="lag.remote_device" class="text-gray-400">&rarr; {{ lag.remote_device }}</span>
          <button
            class="ml-1 rounded p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
            @click.stop="$emit('delete-lag', lag)"
          >
            <UIcon name="i-heroicons-x-mark" class="h-3 w-3" />
          </button>
        </div>
      </template>

      <button
        v-if="lagGroups.length > 3"
        class="text-primary-500 hover:text-primary-400 text-[11px]"
        @click="lagExpanded = !lagExpanded"
      >
        {{ lagExpanded ? $t('common.showLess') : $t('lag.showAll', { n: lagGroups.length }) }}
      </button>
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
  stackSize?: number
  lagGroups?: any[]
  lagByPortId?: Map<string, any>
  printMode?: boolean
}>()

const emit = defineEmits<{
  'select-port': [portId: string]
  'toggle-select': [portId: string]
  'edit-lag': [lag: any]
  'delete-lag': [lag: any]
}>()

const highlightedLagId = ref<string | null>(null)

function isDimmed(portId: string): boolean {
  if (!highlightedLagId.value) return false
  if (props.selectedPorts.length > 0) return false  // selection takes priority
  const portLag = props.lagByPortId?.get(portId)
  return !portLag || portLag.id !== highlightedLagId.value
}

const lagExpanded = ref(false)

const visibleLags = computed(() => {
  if (!props.lagGroups) return []
  if (lagExpanded.value || props.lagGroups.length <= 3) return props.lagGroups
  return props.lagGroups.slice(0, 3)
})

function onLagHover(lagId: string) {
  if (props.selectedPorts.length > 0) return
  highlightedLagId.value = lagId
}

function onLagLeave() {
  highlightedLagId.value = null
}

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
    .filter(p =>
      p.unit === unitNumber &&
      p.type === block.type &&
      p.index >= block.start_index &&
      p.index < block.start_index + block.count
    )
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

// Stack member dividers: when stackSize > 1, insert a divider before every N-th unit
const unitsPerMember = computed(() => {
  if (!props.units?.length || !props.stackSize || props.stackSize <= 1) return 0
  return Math.ceil(props.units.length / props.stackSize)
})

function shouldShowMemberDivider(unitIndex: number): boolean {
  const n = unitsPerMember.value
  if (!n) return false
  return unitIndex > 0 && unitIndex % n === 0
}

function getMemberNumber(unitIndex: number): number {
  const n = unitsPerMember.value
  if (!n) return 1
  return Math.floor(unitIndex / n) + 1
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
