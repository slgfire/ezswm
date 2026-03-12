<script setup lang="ts">
import type { LayoutTemplate, Port, Switch } from '~/types/models'

const route = useRoute()
const { data: sw, refresh } = await useFetch<Switch>(`/api/switches/${route.params.id}`)
const { data: layouts } = await useFetch<LayoutTemplate[]>('/api/layouts')

const selected = ref<Port>()
const selectedPortNumber = ref<number>()
const portPanelOpen = ref(false)

const activeLayout = computed(() => {
  if (!sw.value) return undefined
  if (sw.value.layoutOverride) return sw.value.layoutOverride
  return layouts.value?.find((l) => l.id === sw.value?.layoutTemplateId)
})

async function saveSwitch() {
  if (!sw.value) return
  await $fetch(`/api/switches/${sw.value.id}`, { method: 'PUT', body: sw.value })
  await refresh()
}

function onSelectPort(port: Port | undefined, fallback: number) {
  selected.value = port
  selectedPortNumber.value = fallback
  portPanelOpen.value = true
}

function closePortPanel() {
  portPanelOpen.value = false
}

async function savePortChanges(payload: Port) {
  if (!sw.value) return
  const updated = await $fetch<Port>(`/api/switches/${sw.value.id}/ports/${payload.portNumber}`, {
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
}
</script>

<template>
  <div v-if="sw">
    <SwitchDetails :item="sw" :layout="activeLayout" />

    <div class="panel">
      <h3>Layout-Zuweisung</h3>
      <div class="row">
        <select v-model="sw.layoutTemplateId" @change="saveSwitch">
          <option v-for="layout in layouts || []" :key="layout.id" :value="layout.id">{{ layout.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="activeLayout" class="panel stack">
      <h3>Port-Darstellung</h3>
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
    </div>

    <PortEditPanel
      :open="portPanelOpen"
      :port="selected"
      :fallback-port-number="selectedPortNumber"
      :switch-name="sw.name"
      @close="closePortPanel"
      @save="savePortChanges"
    />

    <div class="panel stack">
      <h3>Port-Liste</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Label</th><th>Status</th><th>VLAN</th><th>Gerät</th></tr>
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
    </div>
  </div>
</template>
