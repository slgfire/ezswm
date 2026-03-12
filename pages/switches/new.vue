<script setup lang="ts">
import type { SwitchStatus } from '~/types/models'

const { data: meta } = await useFetch('/api/meta')
const router = useRouter()

const form = reactive({
  name: '',
  vendor: '',
  model: '',
  rackPosition: '',
  managementIp: '',
  serialNumber: '',
  portCount: 24,
  description: '',
  status: 'planned' as SwitchStatus,
  tags: '',
  layoutTemplateId: ''
})

const locationInput = ref('')
const rackInput = ref('')

const normalized = (value: string) => value.trim().replace(/\s+/g, ' ')

const locationOptions = computed(() => ((meta.value as any)?.locations || []).map((location: any) => location.name))

const selectedLocationId = computed(() => {
  const value = normalized(locationInput.value).toLocaleLowerCase()
  if (!value) return ''
  const location = ((meta.value as any)?.locations || []).find((entry: any) => entry.name.trim().toLocaleLowerCase() === value)
  return location?.id || ''
})

const rackOptions = computed(() => {
  const racks = (meta.value as any)?.racks || []
  if (!selectedLocationId.value) {
    return racks.map((rack: any) => rack.name)
  }

  return racks
    .filter((rack: any) => rack.locationId === selectedLocationId.value)
    .map((rack: any) => rack.name)
})

watch(selectedLocationId, () => {
  rackInput.value = ''
})

async function submit() {
  await $fetch('/api/switches', {
    method: 'POST',
    body: {
      ...form,
      locationName: normalized(locationInput.value),
      rackName: normalized(rackInput.value),
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
      <input
        v-model="locationInput"
        list="location-options"
        placeholder="Standort auswählen oder neu anlegen"
      >
      <datalist id="location-options">
        <option v-for="location in locationOptions" :key="location" :value="location" />
      </datalist>
      <input
        v-model="rackInput"
        list="rack-options"
        placeholder="Rack auswählen oder neu anlegen"
      >
      <datalist id="rack-options">
        <option v-for="rack in rackOptions" :key="rack" :value="rack" />
      </datalist>
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
