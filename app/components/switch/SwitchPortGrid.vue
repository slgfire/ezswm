<template>
  <div class="space-y-6">
    <template v-if="units && units.length">
      <div v-for="(unit, ui) in units" :key="unit.unit_number">
        <SwitchUnitDivider v-if="ui > 0" :label="unit.label || `Unit ${unit.unit_number}`" />
        <div class="mb-3 text-sm font-semibold text-gray-300">{{ unit.label || `Unit ${unit.unit_number}` }}</div>
        <div class="flex flex-wrap items-start gap-6">
          <div v-for="block in unit.blocks" :key="block.id" class="flex flex-col gap-1.5">
            <div v-if="block.label" class="text-xs font-medium text-gray-500">{{ block.label }}</div>
            <div
              class="grid gap-2"
              :style="{ gridTemplateColumns: `repeat(${Math.ceil(block.count / block.rows)}, 1fr)` }"
            >
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
    <div v-else class="grid grid-cols-12 gap-1">
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
</script>
