<template>
  <div v-if="network" class="space-y-4">
    <UCard>
      <template #header>{{ network.name }} (VLAN {{ network.vlanId }})</template>
      <p>{{ network.subnet }}/{{ network.prefix }} · {{ network.netmask }} · GW {{ network.gateway }}</p>
    </UCard>

    <div class="grid md:grid-cols-2 gap-4">
      <UCard>
        <template #header><div class="flex justify-between"><span>{{ t('network.allocations') }}</span><UButton size="xs" @click="allocOpen=true">Add</UButton></div></template>
        <UTable :rows="network.allocations" :columns="allocCols" />
      </UCard>
      <UCard>
        <template #header><div class="flex justify-between"><span>{{ t('network.ranges') }}</span><UButton size="xs" @click="rangeOpen=true">Add</UButton></div></template>
        <UTable :rows="network.ranges" :columns="rangeCols" />
      </UCard>
    </div>

    <USlideover v-model="allocOpen"><UCard><template #header>Add IP allocation</template><div class="space-y-2"><UInput v-model="alloc.ipAddress" placeholder="IP" /><UInput v-model="alloc.hostname" placeholder="Hostname" /></div><template #footer><UButton @click="addAllocation">Save</UButton></template></UCard></USlideover>
    <USlideover v-model="rangeOpen"><UCard><template #header>Add IP range</template><div class="space-y-2"><UInput v-model="range.name" placeholder="Name" /><UInput v-model="range.startIp" placeholder="Start IP" /><UInput v-model="range.endIp" placeholder="End IP" /><USelect v-model="range.type" :options="['dhcp','reserved','static','infrastructure']" /></div><template #footer><UButton @click="addRange">Save</UButton></template></UCard></USlideover>
  </div>
</template>
<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { data: network, refresh } = await useFetch(`/api/networks/${route.params.id}`)
const allocOpen = ref(false)
const rangeOpen = ref(false)
const alloc = reactive({ ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'active', description: '', notes: '' })
const range = reactive({ name: '', type: 'dhcp', startIp: '', endIp: '', description: '', notes: '' })
const allocCols = [{ key: 'ipAddress', label: 'IP' }, { key: 'hostname', label: 'Hostname' }, { key: 'status', label: 'Status' }]
const rangeCols = [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'startIp', label: 'Start' }, { key: 'endIp', label: 'End' }]
const addAllocation = async () => { await $fetch(`/api/networks/${route.params.id}/allocations`, { method: 'POST', body: alloc }); allocOpen.value = false; refresh() }
const addRange = async () => { await $fetch(`/api/networks/${route.params.id}/ranges`, { method: 'POST', body: range }); rangeOpen.value = false; refresh() }
</script>
