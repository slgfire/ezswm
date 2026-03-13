<script setup lang="ts">
import type { Port } from '~/types/models'

defineProps<{ port?: Port; fallbackPortNumber?: number }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div v-if="port || fallbackPortNumber" class="panel stack">
    <div class="row row-between">
      <h3 class="section-title">Port {{ port?.portNumber || fallbackPortNumber }}</h3>
      <button class="secondary" @click="emit('close')">Close</button>
    </div>
    <p><strong>Status:</strong> <PortBadge :status="port?.status || 'free'" /></p>
    <p><strong>Label:</strong> {{ port?.label || '-' }}</p>
    <p><strong>VLAN:</strong> {{ port?.vlan || '-' }}</p>
    <p><strong>Device:</strong> {{ port?.connectedDevice || '-' }}</p>
    <p><strong>MAC:</strong> {{ port?.macAddress || '-' }}</p>
    <p><strong>Type:</strong> {{ port?.mediaType || '-' }}</p>
  </div>
</template>
