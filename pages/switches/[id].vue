<script setup lang="ts">
import type { LayoutTemplate, Port, Switch } from '~/types/models'

const route = useRoute()
const { data: sw, refresh } = await useFetch<Switch>(`/api/switches/${route.params.id}`)
const { data: layouts } = await useFetch<LayoutTemplate[]>('/api/layouts')

const selected = ref<Port>()
const selectedPortNumber = ref<number>()

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

async function savePort(port: Port) {
  if (!sw.value) return
  const idx = sw.value.ports.findIndex((p) => p.portNumber === port.portNumber)
  if (idx >= 0) sw.value.ports[idx] = port
  await $fetch(`/api/switches/${sw.value.id}`, { method: 'PUT', body: sw.value })
  await refresh()
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
      <SwitchPortGrid :layout="activeLayout" :ports="sw.ports" @select="(port, fallback) => { selected = port; selectedPortNumber = fallback }" />
    </div>

    <PortDetailsModal :port="selected" :fallback-port-number="selectedPortNumber" @close="selected = undefined; selectedPortNumber = undefined" />

    <div class="panel stack">
      <h3>Port-Liste</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Label</th><th>Status</th><th>VLAN</th><th>Gerät</th></tr>
          </thead>
          <tbody>
            <tr v-for="port in sw.ports" :key="port.portNumber">
              <td>{{ port.portNumber }}</td>
              <td><input v-model="port.label" placeholder="Label" @blur="savePort(port)"></td>
              <td>
                <select v-model="port.status" @change="savePort(port)">
                  <option value="free">free</option>
                  <option value="used">used</option>
                  <option value="disabled">disabled</option>
                  <option value="error">error</option>
                </select>
              </td>
              <td><input v-model="port.vlan" placeholder="VLAN" @blur="savePort(port)"></td>
              <td><input v-model="port.connectedDevice" placeholder="Gerät" @blur="savePort(port)"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
