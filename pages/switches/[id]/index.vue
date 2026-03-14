<script setup lang="ts">
import type { LayoutTemplate, Port } from '~/types/models'

const route = useRoute()
const { data: sw, refresh } = await useFetch<any>(`/api/switches/${route.params.id}`)
const { data: layouts } = await useFetch<LayoutTemplate[]>('/api/layouts')
const selectedPort = ref<Port | null>(null)
const editOpen = ref(false)

const layout = computed(() => layouts.value?.find(item => item.id === sw.value?.layoutTemplateId))

const blockPorts = (block: LayoutTemplate['blocks'][number]) => {
  if (!sw.value?.ports) return []
  if (block.explicitPorts?.length) return sw.value.ports.filter((p: Port) => block.explicitPorts?.includes(p.portNumber))
  return sw.value.ports.filter((p: Port) => Number(p.portNumber) >= (block.startPort || 0) && Number(p.portNumber) <= (block.endPort || 0))
}

const portColor = (port: Port) => {
  if (port.status === 'up') return 'success'
  if (port.status === 'down') return 'warning'
  return 'neutral'
}

const editPort = (port: Port) => {
  selectedPort.value = { ...port }
  editOpen.value = true
}

const savePort = async () => {
  if (!selectedPort.value) return
  await $fetch(`/api/switches/${route.params.id}/ports/${selectedPort.value.id}`, { method: 'PUT', body: selectedPort.value })
  editOpen.value = false
  await refresh()
}
</script>

<template>
  <div v-if="sw">
    <PageHeader :title="sw.name" :description="`${sw.vendor} ${sw.model} • ${sw.location}`" />

    <UCard class="mb-4">
      <div class="grid gap-3 md:grid-cols-3 text-sm">
        <p><strong>Management IP:</strong> {{ sw.managementIp }}</p>
        <p><strong>Rack:</strong> {{ sw.rack }} / {{ sw.rackPosition }}</p>
        <p><strong>Status:</strong> {{ sw.status }}</p>
      </div>
    </UCard>

    <div class="space-y-4">
      <UCard v-for="block in (layout?.blocks || []).sort((a,b) => a.order - b.order)" :key="block.id">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ block.name }}</h3>
            <UBadge variant="soft">{{ block.type }}</UBadge>
          </div>
        </template>

        <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${block.columns}, minmax(0, 1fr))` }">
          <UButton
            v-for="port in blockPorts(block)"
            :key="port.id"
            size="xs"
            :color="portColor(port)"
            variant="soft"
            class="justify-center"
            @click="editPort(port)"
          >
            {{ port.portNumber }}
          </UButton>
        </div>
      </UCard>
    </div>

    <USlideover v-model:open="editOpen" title="Edit port">
      <template #body>
        <div v-if="selectedPort" class="space-y-3">
          <UInput v-model="selectedPort.label" label="Label" />
          <USelect v-model="selectedPort.status" :items="['up','down','disabled']" label="Status" />
          <UInput v-model="selectedPort.vlan" type="number" label="VLAN" />
          <UInput v-model="selectedPort.connectedDevice" label="Connected Device" />
          <UInput v-model="selectedPort.patchTarget" label="Patch Target" />
          <UTextarea v-model="selectedPort.description" label="Description" />
          <UButton block @click="savePort">Save</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
