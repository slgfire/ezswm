<script setup lang="ts">
import type { LayoutBlock, Port } from '~/types/domain'

const route = useRoute()
const { t } = useI18n()
const { data: sw, refresh } = await useFetch(`/api/switches/${route.params.id}`)
const { data: layouts } = await useLayouts()

const currentLayout = computed(() => layouts.value?.find(layout => layout.id === sw.value?.layoutTemplateId))

const getBlockPorts = (block: LayoutBlock) => {
  return (sw.value?.ports || []).filter(port => port.portNumber >= block.startPort && port.portNumber <= block.endPort)
}

const open = ref(false)
const editingPort = ref<Port | null>(null)
const form = ref<Partial<Port>>({ duplex: 'auto' })

const openPort = (port: Port) => {
  editingPort.value = port
  form.value = structuredClone(port)
  open.value = true
}

const savePort = async () => {
  if (!editingPort.value) return
  await $fetch(`/api/switches/${route.params.id}/ports/${editingPort.value.portNumber}`, { method: 'PUT', body: form.value })
  open.value = false
  await refresh()
}
</script>

<template>
  <div class="space-y-4" v-if="sw">
    <UCard>
      <h2 class="text-2xl font-semibold">{{ sw.name }}</h2>
      <p class="text-sm text-gray-500">{{ sw.vendor }} {{ sw.model }} · {{ sw.managementIp }}</p>
    </UCard>

    <UCard v-for="block in currentLayout?.blocks || []" :key="block.id">
      <template #header>
        <div>
          <h3 class="font-semibold">{{ block.name }}</h3>
          <p class="text-xs text-gray-500">Ports {{ block.startPort }}-{{ block.endPort }}</p>
        </div>
      </template>

      <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${block.columns}, minmax(0, 1fr))` }">
        <button
          v-for="port in getBlockPorts(block)"
          :key="port.portNumber"
          class="rounded border p-2 text-left text-xs hover:border-green-500 dark:border-gray-700"
          :class="port.status === 'active' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'"
          @click="openPort(port)"
        >
          <p class="font-semibold">{{ port.portNumber }}</p>
          <p class="truncate">{{ port.label }}</p>
        </button>
      </div>
    </UCard>

    <USlideover v-model="open">
      <UCard>
        <template #header>{{ t('switches.editPort') }}</template>
        <div class="grid gap-3">
          <UInput v-model="form.label" :placeholder="t('switches.portFields.label')" />
          <USelectMenu v-model="form.status" :options="['active','inactive','planned','error']" />
          <UInput v-model.number="form.vlan" :placeholder="t('switches.portFields.vlan')" />
          <UInput v-model="form.connectedDevice" :placeholder="t('switches.portFields.connectedDevice')" />
          <USelectMenu v-model="form.duplex" :options="['auto','half','full']" />
        </div>
        <template #footer>
          <div class="flex justify-end">
            <UButton color="green" @click="savePort">{{ t('common.save') }}</UButton>
          </div>
        </template>
      </UCard>
    </USlideover>
  </div>
</template>
