<script setup lang="ts">
import type { LayoutTemplate, Port, PortUpdatePayload, Switch } from '~/types/models'

const route = useRoute()
const { data: sw, refresh } = await useFetch<Switch>(`/api/switches/${route.params.id}`)
const { data: layouts } = await useFetch<LayoutTemplate[]>('/api/layouts')
const { data: meta } = await useFetch('/api/meta')

const editForm = reactive({
  name: '',
  vendor: '',
  model: '',
  managementIp: '',
  serialNumber: '',
  rackPosition: '',
  status: 'planned',
  description: '',
  tags: '',
  locationName: '',
  rackName: ''
})

const selected = ref<Port>()
const selectedPortNumber = ref<number>()
const portPanelOpen = ref(false)
const editDrawerOpen = ref(false)
const portSaveState = ref<'idle' | 'saving' | 'success' | 'error'>('idle')
const portSaveMessage = ref('')

const activeLayout = computed(() => {
  if (!sw.value) return undefined
  if (sw.value.layoutOverride) return sw.value.layoutOverride
  return layouts.value?.find((l) => l.id === sw.value?.layoutTemplateId)
})

async function saveSwitch() {
  if (!sw.value) return
  await $fetch(`/api/switches/${sw.value.id}`, {
    method: 'PUT',
    body: {
      ...sw.value,
      ...editForm,
      locationName: normalized(editForm.locationName),
      rackName: normalized(editForm.rackName),
      tags: editForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    }
  })
  await refresh()
}

const normalized = (value: string) => value.trim().replace(/\s+/g, ' ')

const locationOptions = computed(() => ((meta.value as any)?.locations || []).map((location: any) => location.name))

const selectedLocationId = computed(() => {
  const value = normalized(editForm.locationName).toLocaleLowerCase()
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
  editForm.rackName = ''
})

watch([sw, meta], () => {
  if (!sw.value) return

  const locations = (meta.value as any)?.locations || []
  const racks = (meta.value as any)?.racks || []
  const location = locations.find((entry: any) => entry.id === sw.value?.locationId)
  const rack = racks.find((entry: any) => entry.id === sw.value?.rackId)

  editForm.name = sw.value.name
  editForm.vendor = sw.value.vendor
  editForm.model = sw.value.model
  editForm.managementIp = sw.value.managementIp
  editForm.serialNumber = sw.value.serialNumber || ''
  editForm.rackPosition = sw.value.rackPosition || ''
  editForm.status = sw.value.status
  editForm.description = sw.value.description || ''
  editForm.tags = (sw.value.tags || []).join(', ')
  editForm.locationName = location?.name || ''
  editForm.rackName = rack?.name || ''
}, { immediate: true })

function onSelectPort(port: Port | undefined, fallback: number) {
  selected.value = port
  selectedPortNumber.value = fallback
  portPanelOpen.value = true
}

function closePortPanel() {
  portPanelOpen.value = false
}

async function savePortChanges(payload: PortUpdatePayload) {
  if (!sw.value) return
  const portNumber = selectedPortNumber.value
  if (!portNumber) return

  portSaveState.value = 'saving'
  portSaveMessage.value = ''

  try {
    const updated = await $fetch<Port>(`/api/switches/${sw.value.id}/ports/${portNumber}`, {
      method: 'PUT',
      body: payload
    })

    const idx = sw.value.ports.findIndex((port) => port.portNumber === updated.portNumber)
    if (idx >= 0) {
      sw.value.ports[idx] = updated
    }

    selected.value = updated
    await refresh()
    closePortPanel()
    portSaveState.value = 'success'
    portSaveMessage.value = `Port ${updated.portNumber} saved.`
  } catch (error: any) {
    portSaveState.value = 'error'
    portSaveMessage.value = error?.data?.statusMessage || error?.message || 'Saving port failed.'
  }
}
</script>

<template>
  <div v-if="sw" class="stack">
    <SwitchDetails :item="sw" :layout="activeLayout" />

    <UCard class="stack">
      <template #header>
        <div class="row row-between">
          <h3>Layout assignment</h3>
          <UBadge color="neutral" variant="subtle">{{ activeLayout?.name || 'No layout assigned' }}</UBadge>
        </div>
      </template>
      <USelect v-model="sw.layoutTemplateId" :items="(layouts || []).map((layout) => ({ label: layout.name, value: layout.id }))" @update:model-value="saveSwitch" />
      <small>
        Layout templates are managed centrally in
        <NuxtLink class="inline-link" to="/settings/port-layouts">Settings → Port layouts</NuxtLink>.
      </small>
    </UCard>

    <UCard class="stack">
      <template #header>
        <div class="row row-between">
          <h3>Switch configuration</h3>
          <UButton color="neutral" variant="soft" icon="i-lucide-pencil" label="Edit switch" @click="editDrawerOpen = true" />
        </div>
      </template>
    </UCard>

    <FormDrawer
      :open="editDrawerOpen"
      title="Edit switch"
      description="Update switch metadata and placement details."
      @close="editDrawerOpen = false"
    >
      <form class="stack" @submit.prevent="saveSwitch(); editDrawerOpen = false">
        <div class="network-form-grid">
          <input v-model="editForm.name" required placeholder="Name">
          <input v-model="editForm.vendor" required placeholder="Vendor">
          <input v-model="editForm.model" required placeholder="Model">
          <input v-model="editForm.managementIp" required placeholder="Management IP">
          <input v-model="editForm.locationName" list="location-options" placeholder="Select existing location or create a new one">
          <datalist id="location-options">
            <option v-for="location in locationOptions" :key="location" :value="location" />
          </datalist>
          <input v-model="editForm.rackName" list="rack-options" placeholder="Select existing rack or create a new one">
          <datalist id="rack-options">
            <option v-for="rack in rackOptions" :key="rack" :value="rack" />
          </datalist>
          <input v-model="editForm.rackPosition" placeholder="Rack position">
          <input v-model="editForm.serialNumber" placeholder="Serial number">
          <input v-model="editForm.tags" placeholder="Tags (csv)">
          <select v-model="editForm.status">
            <option value="active">active</option>
            <option value="planned">planned</option>
            <option value="retired">retired</option>
          </select>
        </div>
        <textarea v-model="editForm.description" placeholder="Description" rows="3" />
        <div class="row row-end">
          <UButton type="button" color="neutral" variant="soft" label="Cancel" @click="editDrawerOpen = false" />
          <UButton type="submit" icon="i-lucide-save" label="Save switch" />
        </div>
      </form>
    </FormDrawer>

    <UCard v-if="activeLayout" class="stack">
      <template #header>
        <h3>Port layout</h3>
      </template>
      <div class="row">
        <PortBadge status="free" />
        <PortBadge status="used" />
        <PortBadge status="disabled" />
        <PortBadge status="error" />
      </div>
      <SwitchPortGrid
        :layout="activeLayout"
        :ports="sw.ports"
        :selected-port-number="selectedPortNumber"
        @select="onSelectPort"
      />
    </UCard>

    <PortEditPanel
      :open="portPanelOpen"
      :port="selected"
      :fallback-port-number="selectedPortNumber"
      :switch-name="sw.name"
      @close="closePortPanel"
      @save="savePortChanges"
    />

    <UAlert v-if="portSaveState === 'success'" color="success" variant="soft" :title="portSaveMessage" />
    <UAlert v-if="portSaveState === 'error'" color="error" variant="soft" :title="portSaveMessage" />

    <UCard class="stack">
      <template #header><h3>Port list</h3></template>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Label</th><th>Status</th><th>VLAN</th><th>Device</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="port in sw.ports"
              :key="port.portNumber"
              :class="{ 'port-row-selected': selectedPortNumber === port.portNumber }"
              @click="onSelectPort(port, port.portNumber)"
            >
              <td>{{ port.portNumber }}</td>
              <td>{{ port.label || '-' }}</td>
              <td><PortBadge :status="port.status" /></td>
              <td>{{ port.vlan || '-' }}</td>
              <td>{{ port.connectedDevice || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
</style>
