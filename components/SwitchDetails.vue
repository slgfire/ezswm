<script setup lang="ts">
import type { LayoutTemplate, Switch } from '~/types/models'

defineProps<{ item: Switch; layout?: LayoutTemplate }>()

function switchStatusClass(status: string) {
  if (status === 'active') return 'badge badge--success'
  if (status === 'planned') return 'badge badge--warning'
  if (status === 'retired') return 'badge badge--danger'
  return 'badge badge--neutral'
}
</script>

<template>
  <div class="panel stack">
    <h2>{{ item.name }}</h2>
    <p>{{ item.vendor }} / {{ item.model }}</p>
    <p><strong>Status:</strong> <span :class="switchStatusClass(item.status)">{{ item.status }}</span></p>
    <p><strong>Management-IP:</strong> {{ item.managementIp }}</p>
    <p><strong>Layout:</strong> {{ layout?.name || item.layoutTemplateId || 'Override' }}</p>
    <p><strong>Rack:</strong> {{ item.rackId || '-' }} @ {{ item.rackPosition || '-' }}</p>
    <p><strong>Beschreibung:</strong> {{ item.description || '-' }}</p>
  </div>
</template>
