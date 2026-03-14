<script setup lang="ts">
import type { PortStatus } from '~/types/models'

const props = defineProps<{ status: PortStatus }>()

const statusLabel: Record<PortStatus, string> = {
  free: 'Free',
  used: 'Used',
  disabled: 'Disabled',
  error: 'Error'
}

const statusColor: Record<PortStatus, 'neutral' | 'success' | 'warning' | 'error'> = {
  free: 'neutral',
  used: 'success',
  disabled: 'warning',
  error: 'error'
}
</script>

<template>
  <UBadge :color="statusColor[props.status]" variant="subtle">{{ statusLabel[props.status] }}</UBadge>
</template>
