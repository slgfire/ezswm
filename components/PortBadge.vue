<script setup lang="ts">
import type { PortStatus } from '~/types/models'

const props = defineProps<{ status: PortStatus }>()

const statusLabel: Record<PortStatus, string> = {
  free: 'Frei',
  used: 'Belegt',
  disabled: 'Deaktiviert',
  error: 'Fehler'
}
</script>

<template>
  <span>{{ statusLabel[props.status] }}</span>
</template>
