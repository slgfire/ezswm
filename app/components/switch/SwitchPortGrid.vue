<template>
  <div class="space-y-6">
    <!-- Block-based rendering -->
    <template v-if="units && units.length">
      <div v-for="(unit, ui) in units" :key="unit.unit_number">
        <SwitchUnitDivider v-if="ui > 0" :label="unit.label || `Unit ${unit.unit_number}`" />
        <div class="mb-3 text-sm font-semibold text-gray-300">{{ unit.label || `Unit ${unit.unit_number}` }}</div>
        <div class="flex flex-wrap items-start gap-6">
          <div v-for="block in unit.blocks" :key="block.id" class="flex flex-col gap-1.5">
            <div v-if="block.label" class="text-xs font-medium text-gray-500">{{ block.label }}</div>
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
                  @click="$emit('select-port', port.id)"
                  @click.shift="$emit('toggle-select', port.id)"
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
                @click="$emit('select-port', port.id)"
                @click.shift="$emit('toggle-select', port.id)"
              />
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
        @click="$emit('select-port', port.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  ports: any[]
  units?: any[]
  vlans?: any[]
  selectedPorts: string[]
}>()

defineEmits<{
  'select-port': [portId: string]
  'toggle-select': [portId: string]
}>()

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

  if (mode === 'odd-even') {
    const oddPorts = ports.filter(p => p.index % 2 === 1)
    const evenPorts = ports.filter(p => p.index % 2 === 0)
    return [oddPorts, evenPorts]
  }

  if (mode === 'even-odd') {
    const evenPorts = ports.filter(p => p.index % 2 === 0)
    const oddPorts = ports.filter(p => p.index % 2 === 1)
    return [evenPorts, oddPorts]
  }

  // Sequential: split into N rows of equal size
  const perRow = Math.ceil(ports.length / rows)
  const result: any[][] = []
  for (let r = 0; r < rows; r++) {
    result.push(ports.slice(r * perRow, (r + 1) * perRow))
  }
  return result
}

function needsExtraBottomSpace(block: any): boolean {
  return block.type === 'sfp' || block.type === 'sfp+' || block.type === 'qsfp'
}
</script>
