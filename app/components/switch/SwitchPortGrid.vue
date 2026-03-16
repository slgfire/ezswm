<template>
  <div class="space-y-4">
    <template v-if="units && units.length">
      <div v-for="(unit, ui) in units" :key="unit.unit_number">
        <SwitchUnitDivider v-if="ui > 0" :label="unit.label || `Unit ${unit.unit_number}`" />
        <div class="mb-2 text-sm font-medium text-gray-400">{{ unit.label || `Unit ${unit.unit_number}` }}</div>
        <div class="flex flex-wrap gap-4">
          <div v-for="block in unit.blocks" :key="block.id" class="flex flex-col gap-1">
            <div v-if="block.label" class="text-xs text-gray-500">{{ block.label }}</div>
            <div
              class="grid gap-1"
              :style="{ gridTemplateColumns: `repeat(${Math.ceil(block.count / block.rows)}, minmax(0, 1fr))` }"
            >
              <SwitchPortItem
                v-for="port in getPortsForBlock(unit.unit_number, block)"
                :key="port.id"
                :port="port"
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
