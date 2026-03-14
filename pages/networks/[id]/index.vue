<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const { data: network, refresh } = await useFetch<any>(`/api/networks/${route.params.id}`)

const tab = ref('overview')
const allocOpen = ref(false)
const rangeOpen = ref(false)
const allocEdit = ref<any>(null)
const rangeEdit = ref<any>(null)
const allocForm = reactive<any>({ ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'used', description: '', notes: '' })
const rangeForm = reactive<any>({ name: '', type: 'dhcp', startIp: '', endIp: '', description: '', notes: '' })

const startAlloc = (item?: any) => { allocEdit.value = item || null; Object.assign(allocForm, item || { ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'used', description: '', notes: '' }); allocOpen.value = true }
const startRange = (item?: any) => { rangeEdit.value = item || null; Object.assign(rangeForm, item || { name: '', type: 'dhcp', startIp: '', endIp: '', description: '', notes: '' }); rangeOpen.value = true }

const saveAlloc = async () => {
  if (allocEdit.value) await $fetch(`/api/networks/${route.params.id}/allocations/${allocEdit.value.id}`, { method: 'PUT', body: allocForm })
  else await $fetch(`/api/networks/${route.params.id}/allocations`, { method: 'POST', body: allocForm })
  allocOpen.value = false
  await refresh()
}

const saveRange = async () => {
  if (rangeEdit.value) await $fetch(`/api/networks/${route.params.id}/ranges/${rangeEdit.value.id}`, { method: 'PUT', body: rangeForm })
  else await $fetch(`/api/networks/${route.params.id}/ranges`, { method: 'POST', body: rangeForm })
  rangeOpen.value = false
  await refresh()
}

const deleteAlloc = async (id: string) => { await $fetch(`/api/networks/${route.params.id}/allocations/${id}`, { method: 'DELETE' }); await refresh() }
const deleteRange = async (id: string) => { await $fetch(`/api/networks/${route.params.id}/ranges/${id}`, { method: 'DELETE' }); await refresh() }
</script>

<template>
  <div v-if="network">
    <PageHeader :title="`${network.name} (VLAN ${network.vlanId})`" :description="`${network.subnet}/${network.prefix} • Netmask ${network.netmask}`" />

    <UTabs v-model="tab" :items="[{ label: t('network.tabs.overview'), value: 'overview' }, { label: t('network.tabs.allocations'), value: 'allocations' }, { label: t('network.tabs.ranges'), value: 'ranges' }]" />

    <UCard v-if="tab === 'overview'" class="mt-4">
      <div class="grid gap-3 md:grid-cols-2 text-sm">
        <p><strong>Gateway:</strong> {{ network.gateway }}</p>
        <p><strong>Category:</strong> {{ network.category }}</p>
        <p><strong>Description:</strong> {{ network.description || '-' }}</p>
        <p><strong>Notes:</strong> {{ network.notes || '-' }}</p>
      </div>
    </UCard>

    <UCard v-if="tab === 'allocations'" class="mt-4">
      <template #header>
        <div class="flex justify-between"><h3 class="font-semibold">{{ t('network.tabs.allocations') }}</h3><UButton size="xs" icon="i-lucide-plus" @click="startAlloc()" /></div>
      </template>
      <table class="w-full text-sm">
        <thead><tr class="border-b border-default text-left"><th class="p-2">IP</th><th class="p-2">Hostname</th><th class="p-2">Status</th><th class="p-2" /></tr></thead>
        <tbody>
          <tr v-for="item in network.allocations" :key="item.id" class="border-b border-default/60">
            <td class="p-2">{{ item.ipAddress }}</td><td class="p-2">{{ item.hostname }}</td><td class="p-2">{{ item.status }}</td>
            <td class="p-2 text-right space-x-2"><UButton size="xs" variant="soft" icon="i-lucide-pencil" @click="startAlloc(item)" /><UButton size="xs" color="error" variant="soft" icon="i-lucide-trash" @click="deleteAlloc(item.id)" /></td>
          </tr>
        </tbody>
      </table>
    </UCard>

    <UCard v-if="tab === 'ranges'" class="mt-4">
      <template #header>
        <div class="flex justify-between"><h3 class="font-semibold">{{ t('network.tabs.ranges') }}</h3><UButton size="xs" icon="i-lucide-plus" @click="startRange()" /></div>
      </template>
      <table class="w-full text-sm">
        <thead><tr class="border-b border-default text-left"><th class="p-2">Name</th><th class="p-2">Type</th><th class="p-2">Start</th><th class="p-2">End</th><th class="p-2" /></tr></thead>
        <tbody>
          <tr v-for="item in network.ranges" :key="item.id" class="border-b border-default/60">
            <td class="p-2">{{ item.name }}</td><td class="p-2">{{ item.type }}</td><td class="p-2">{{ item.startIp }}</td><td class="p-2">{{ item.endIp }}</td>
            <td class="p-2 text-right space-x-2"><UButton size="xs" variant="soft" icon="i-lucide-pencil" @click="startRange(item)" /><UButton size="xs" color="error" variant="soft" icon="i-lucide-trash" @click="deleteRange(item.id)" /></td>
          </tr>
        </tbody>
      </table>
    </UCard>

    <USlideover v-model:open="allocOpen" title="IP Allocation">
      <template #body><div class="space-y-3"><UInput v-model="allocForm.ipAddress" label="IP address" /><UInput v-model="allocForm.hostname" label="Hostname" /><USelect v-model="allocForm.status" :items="['used','reserved','planned']" label="Status" /><UInput v-model="allocForm.serviceName" label="Service" /><UTextarea v-model="allocForm.notes" label="Notes" /><UButton block @click="saveAlloc">Save</UButton></div></template>
    </USlideover>

    <USlideover v-model:open="rangeOpen" title="IP Range">
      <template #body><div class="space-y-3"><UInput v-model="rangeForm.name" label="Name" /><USelect v-model="rangeForm.type" :items="['dhcp','reserved','static','infrastructure']" label="Type" /><UInput v-model="rangeForm.startIp" label="Start IP" /><UInput v-model="rangeForm.endIp" label="End IP" /><UTextarea v-model="rangeForm.notes" label="Notes" /><UButton block @click="saveRange">Save</UButton></div></template>
    </USlideover>
  </div>
</template>
