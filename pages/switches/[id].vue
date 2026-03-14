<script setup lang="ts">
import type { LayoutBlock, LayoutTemplate, Port, Switch } from '~/types/models'

const { t } = useI18n()
const route = useRoute()
const portPanel = ref(false)
const selectedPort = ref<Port | null>(null)

const { data: sw, refresh } = await useFetch<Switch>(`/api/switches/${route.params.id}`)
const { data: layouts } = await useFetch<LayoutTemplate[]>('/api/layout-templates')

const layout = computed(() => layouts.value?.find((item) => item.id === sw.value?.layoutTemplateId))

function blockPorts(block: LayoutBlock): Port[] {
  if (!sw.value) return []
  if (block.explicitPorts?.length) {
    return sw.value.ports.filter((port) => block.explicitPorts?.includes(port.identifier))
  }

  return sw.value.ports.filter((port) => {
    const number = Number(port.identifier)
    return Number.isFinite(number) && block.startPort && block.endPort && number >= block.startPort && number <= block.endPort
  })
}

function statusColor(status: Port['status']) {
  if (status === 'up') return 'success'
  if (status === 'down') return 'warning'
  return 'error'
}

function openPort(port: Port) {
  selectedPort.value = { ...port }
  portPanel.value = true
}

async function savePort() {
  if (!selectedPort.value) return
  await $fetch(`/api/switches/${route.params.id}/ports/${selectedPort.value.id}`, { method: 'PUT', body: selectedPort.value })
  portPanel.value = false
  await refresh()
}
</script>

<template>
  <div v-if="sw" class="space-y-4">
    <div class="flex justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ sw.name }}</h1>
        <p class="text-muted">{{ sw.model }} · {{ sw.location }} · {{ sw.managementIp }}</p>
      </div>
      <UBadge :color="sw.status === 'active' ? 'success' : 'warning'">{{ sw.status }}</UBadge>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">{{ t('switch.portLayout') }} - {{ layout?.name }}</h2>
      </template>
      <div class="space-y-4">
        <UCard v-for="block in (layout?.blocks || []).sort((a,b)=>a.order-b.order)" :key="block.id">
          <template #header>
            <div class="flex justify-between">
              <h3 class="font-medium">{{ block.name }}</h3>
              <UBadge color="neutral" variant="soft">{{ block.type }}</UBadge>
            </div>
          </template>
          <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${block.columns}, minmax(0, 1fr))` }">
            <UButton
              v-for="port in blockPorts(block)"
              :key="port.id"
              :color="statusColor(port.status)"
              variant="soft"
              size="xs"
              @click="openPort(port)"
            >
              {{ port.identifier }}
            </UButton>
          </div>
        </UCard>
      </div>
    </UCard>

    <USlideover v-model:open="portPanel" :title="t('switch.editPort')">
      <template #body>
        <div v-if="selectedPort" class="space-y-3">
          <UInput v-model="selectedPort.label" :label="t('port.label')" />
          <USelect v-model="selectedPort.status" :items="['up','down','disabled']" :label="t('common.status')" />
          <UInput v-model="selectedPort.vlan" type="number" :label="t('port.vlan')" />
          <UInput v-model="selectedPort.connectedDevice" :label="t('port.connectedDevice')" />
          <UInput v-model="selectedPort.macAddress" :label="t('port.macAddress')" />
          <USelect v-model="selectedPort.duplex" :items="['auto','full','half']" :label="t('port.duplex')" />
          <UInput v-model="selectedPort.speed" :label="t('port.speed')" />
          <UTextarea v-model="selectedPort.description" :label="t('common.description')" />
          <UButton block @click="savePort">{{ t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
