<script setup lang="ts">
import type { PortStatus } from '~/types/models'

const props = defineProps<{ status: PortStatus }>()

const statusLabel: Record<PortStatus, string> = {
  free: 'Frei',
  used: 'Belegt',
  disabled: 'Deaktiviert',
  error: 'Fehler'
}

const statusClass: Record<PortStatus, string> = {
  free: 'badge badge--neutral',
  used: 'badge badge--success',
  disabled: 'badge badge--warning',
  error: 'badge badge--danger'
}
</script>

<template>
  <span :class="statusClass[props.status]">{{ statusLabel[props.status] }}</span>
</template>
