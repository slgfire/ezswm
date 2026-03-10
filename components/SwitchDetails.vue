<script setup lang="ts">
import type { LayoutTemplate, Switch } from '~/types/models'

defineProps<{ item: Switch; layout?: LayoutTemplate }>()
</script>

<template>
  <div class="panel">
    <h2>{{ item.name }}</h2>
    <p>{{ item.vendor }} / {{ item.model }}</p>
    <p><strong>Status:</strong> {{ item.status }}</p>
    <p><strong>Management-IP:</strong> {{ item.managementIp }}</p>
    <p><strong>Layout:</strong> {{ layout?.name || item.layoutTemplateId || 'Override' }}</p>
    <p><strong>Rack:</strong> {{ item.rackId || '-' }} @ {{ item.rackPosition || '-' }}</p>
    <p><strong>Beschreibung:</strong> {{ item.description || '-' }}</p>
  </div>
</template>
