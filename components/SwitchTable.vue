<script setup lang="ts">
import type { Switch } from '~/types/models'

defineProps<{ items: Switch[] }>()
const emit = defineEmits<{ delete: [string] }>()
</script>

<template>
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
        <td>{{ sw.status }}</td>
        <td>{{ sw.managementIp }}</td>
        <td><button class="danger" @click="emit('delete', sw.id)">Löschen</button></td>
      </tr>
    </tbody>
  </table>
</template>
