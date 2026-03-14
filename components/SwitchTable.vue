<script setup lang="ts">
import type { Switch } from '~/types/models'

defineProps<{ items: Switch[] }>()
const emit = defineEmits<{ delete: [string] }>()

function switchStatusColor(status: string) {
  if (status === 'active') return 'success'
  if (status === 'planned') return 'warning'
  if (status === 'retired') return 'error'
  return 'neutral'
}
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Vendor</th>
          <th>Model</th>
          <th>Location</th>
          <th>Status</th>
          <th>Mgmt IP</th>
          <th class="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="sw in items" :key="sw.id">
          <td><NuxtLink :to="`/switches/${sw.id}`" class="inline-link">{{ sw.name }}</NuxtLink></td>
          <td>{{ sw.vendor }}</td>
          <td>{{ sw.model }}</td>
          <td>{{ sw.locationId || '-' }}</td>
          <td><UBadge :color="switchStatusColor(sw.status)" variant="subtle">{{ sw.status }}</UBadge></td>
          <td>{{ sw.managementIp }}</td>
          <td class="text-right"><UButton color="error" variant="soft" size="xs" label="Delete" @click="emit('delete', sw.id)" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
