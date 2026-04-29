<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">{{ sw.name }}</h2>
        <div class="flex gap-1">
          <UBadge v-if="sw.model" color="neutral">{{ sw.model }}</UBadge>
        </div>
      </div>
    </template>
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div v-if="sw.manufacturer"><span class="text-gray-400">Manufacturer:</span> {{ sw.manufacturer }}</div>
      <div v-if="sw.serial_number"><span class="text-gray-400">Serial:</span> {{ sw.serial_number }}</div>
      <div v-if="sw.location"><span class="text-gray-400">Location:</span> {{ sw.location }}</div>
      <div v-if="sw.rack_position"><span class="text-gray-400">Rack:</span> {{ sw.rack_position }}</div>
      <div v-if="sw.management_ip"><span class="text-gray-400">Management IP:</span> <SharedCopyButton :value="sw.management_ip">{{ sw.management_ip }}</SharedCopyButton></div>
      <div v-if="sw.firmware_version"><span class="text-gray-400">Firmware:</span> {{ sw.firmware_version }}</div>
      <div><span class="text-gray-400">Ports:</span> {{ sw.ports?.length || 0 }}</div>
    </div>
    <div v-if="sw.notes" class="mt-3 text-sm text-gray-400">{{ sw.notes }}</div>
  </UCard>
</template>

<script setup lang="ts">
import type { Switch } from '~~/types/switch'
defineProps<{ sw: Switch }>()
</script>
