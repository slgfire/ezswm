<script setup lang="ts">
import type { SwitchStatus } from '~/types/models'

const { data: meta } = await useFetch('/api/meta')
const router = useRouter()

const form = reactive({
  name: '',
  vendor: '',
  model: '',
  locationId: '',
  rackId: '',
  rackPosition: '',
  managementIp: '',
  serialNumber: '',
  portCount: 24,
  description: '',
  status: 'planned' as SwitchStatus,
  tags: '',
  layoutTemplateId: ''
})

async function submit() {
  await $fetch('/api/switches', {
    method: 'POST',
    body: {
      ...form,
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean)
    }
  })
  router.push('/switches')
}
</script>

<template>
  <form class="panel stack" @submit.prevent="submit">
    <h1>Switch anlegen</h1>
    <div class="row">
      <input v-model="form.name" required placeholder="Name">
      <input v-model="form.vendor" required placeholder="Hersteller">
      <input v-model="form.model" required placeholder="Modell">
      <input v-model="form.managementIp" required placeholder="Management-IP">
      <input v-model.number="form.portCount" required type="number" min="1" placeholder="Portanzahl">
      <select v-model="form.status">
        <option value="active">active</option>
        <option value="planned">planned</option>
        <option value="retired">retired</option>
      </select>
      <select v-model="form.locationId">
        <option value="">Standort</option>
        <option v-for="loc in (meta as any)?.locations || []" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
      </select>
      <select v-model="form.rackId">
        <option value="">Rack</option>
        <option v-for="rack in (meta as any)?.racks || []" :key="rack.id" :value="rack.id">{{ rack.name }}</option>
      </select>
      <select v-model="form.layoutTemplateId">
        <option value="">Layout</option>
        <option v-for="layout in (meta as any)?.layoutTemplates || []" :key="layout.id" :value="layout.id">{{ layout.name }}</option>
      </select>
      <input v-model="form.rackPosition" placeholder="Rack-Position">
      <input v-model="form.serialNumber" placeholder="Seriennummer">
      <input v-model="form.tags" placeholder="Tags (csv)">
    </div>
    <textarea v-model="form.description" placeholder="Beschreibung" rows="4"/>
    <div class="row">
      <button type="submit">Speichern</button>
    </div>
  </form>
</template>
