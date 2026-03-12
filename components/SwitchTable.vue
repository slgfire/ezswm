<script setup lang="ts">
import type { Switch } from '~/types/models'

defineProps<{ items: Switch[] }>()
const emit = defineEmits<{ delete: [string] }>()

function switchStatusClass(status: string) {
  if (status === 'active') return 'badge badge--success'
  if (status === 'planned') return 'badge badge--warning'
  if (status === 'retired') return 'badge badge--danger'
  return 'badge badge--neutral'
}
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Hersteller</th>
          <th>Modell</th>
          <th>Standort</th>
          <th>Status</th>
          <th>Mgmt-IP</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="sw in items" :key="sw.id">
          <td><NuxtLink :to="`/switches/${sw.id}`">{{ sw.name }}</NuxtLink></td>
          <td>{{ sw.vendor }}</td>
          <td>{{ sw.model }}</td>
          <td>{{ sw.locationId || '-' }}</td>
          <td><span :class="switchStatusClass(sw.status)">{{ sw.status }}</span></td>
          <td>{{ sw.managementIp }}</td>
          <td><button class="danger" @click="emit('delete', sw.id)">Löschen</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
