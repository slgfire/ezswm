<script setup lang="ts">
import type { Port } from '~/types/models'

const props = defineProps<{ port?: Port; fallbackPortNumber?: number }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div v-if="port || fallbackPortNumber" class="panel">
    <div class="row" style="justify-content: space-between;">
      <h3>Port {{ port?.portNumber || fallbackPortNumber }}</h3>
      <button class="secondary" @click="emit('close')">Schließen</button>
    </div>
    <p><strong>Status:</strong> <PortBadge :status="port?.status || 'free'" /></p>
    <p><strong>Label:</strong> {{ port?.label || '-' }}</p>
    <p><strong>VLAN:</strong> {{ port?.vlan || '-' }}</p>
    <p><strong>Gerät:</strong> {{ port?.connectedDevice || '-' }}</p>
    <p><strong>MAC:</strong> {{ port?.macAddress || '-' }}</p>
    <p><strong>Typ:</strong> {{ port?.mediaType || '-' }}</p>
  </div>
</template>
