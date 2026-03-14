<template>
  <div v-if="sw" class="space-y-4">
    <UCard>
      <template #header><div class="flex justify-between"><h2 class="text-xl font-semibold">{{ sw.name }}</h2><UBadge>{{ sw.status }}</UBadge></div></template>
      <p>{{ sw.vendor }} {{ sw.model }} · {{ sw.location }} · {{ sw.managementIp }}</p>
    </UCard>

    <UCard v-for="block in blocks" :key="block.id">
      <template #header>{{ block.name }} ({{ block.type }})</template>
      <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${block.columns}, minmax(0,1fr))` }">
        <UButton
          v-for="port in portsFor(block)"
          :key="port.portNumber"
          size="xs"
          :color="port.status === 'up' ? 'green' : port.status === 'disabled' ? 'gray' : 'red'"
          variant="soft"
          @click="openPort(port)"
        >{{ port.portNumber }}</UButton>
      </div>
    </UCard>

    <PortPanel v-if="selectedPort" v-model="portPanelOpen" :port="selectedPort" @saved="savePort" />
  </div>
</template>
<script setup lang="ts">
const route = useRoute()
const { data: sw, refresh } = await useFetch(`/api/switches/${route.params.id}`)
const { data: layouts } = await useFetch('/api/layouts')
const portPanelOpen = ref(false)
const selectedPort = ref<any>(null)
const blocks = computed(() => layouts.value?.find((l: any) => l.id === sw.value?.layoutTemplateId)?.blocks || [])
const portsFor = (block: any) => sw.value.ports.filter((p: any) => p.portNumber >= block.startPort && p.portNumber <= block.endPort)
const openPort = (port: any) => { selectedPort.value = { ...port }; portPanelOpen.value = true }
const savePort = async (port: any) => {
  const ports = sw.value.ports.map((p: any) => p.portNumber === port.portNumber ? port : p)
  await $fetch(`/api/switches/${route.params.id}`, { method: 'PATCH', body: { ports } })
  portPanelOpen.value = false
  refresh()
}
</script>
