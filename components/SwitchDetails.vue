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
    <div class="row row-between">
      <div>
        <h2>{{ item.name }}</h2>
        <p>{{ item.vendor }} / {{ item.model }}</p>
      </div>
      <span :class="switchStatusClass(item.status)">{{ item.status }}</span>
    </div>
    <div class="stats">
      <div class="stat">
        <div class="stat-label">Management IP</div>
        <div>{{ item.managementIp }}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Layout</div>
        <div>{{ layout?.name || item.layoutTemplateId || 'Override' }}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Rack</div>
        <div>{{ item.rackId || '-' }} @ {{ item.rackPosition || '-' }}</div>
      </div>
    </div>
    <p><strong>Description:</strong> {{ item.description || '-' }}</p>
  </div>
</template>
