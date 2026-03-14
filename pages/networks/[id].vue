<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const { data: network, refresh } = await useFetch(`/api/networks/${route.params.id}`)

const allocationPanel = ref(false)
const rangePanel = ref(false)
const allocationForm = ref<any>({ ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'active', description: '', notes: '' })
const rangeForm = ref<any>({ name: '', type: 'dhcp', startIp: '', endIp: '', description: '', notes: '' })

const createAllocation = async () => {
  await $fetch(`/api/networks/${route.params.id}/allocations`, { method: 'POST', body: { ...allocationForm.value, id: `ip-${crypto.randomUUID()}` } })
  allocationPanel.value = false
  allocationForm.value = { ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'active', description: '', notes: '' }
  await refresh()
}

const removeAllocation = async (allocationId: string) => {
  await $fetch(`/api/networks/${route.params.id}/allocations/${allocationId}`, { method: 'DELETE' })
  await refresh()
}

const createRange = async () => {
  await $fetch(`/api/networks/${route.params.id}/ranges`, { method: 'POST', body: { ...rangeForm.value, id: `range-${crypto.randomUUID()}` } })
  rangePanel.value = false
  rangeForm.value = { name: '', type: 'dhcp', startIp: '', endIp: '', description: '', notes: '' }
  await refresh()
}
</script>

<template>
  <div class="space-y-4" v-if="network">
    <UCard>
      <h2 class="text-2xl font-semibold">{{ network.name }}</h2>
      <p class="text-sm text-gray-500">VLAN {{ network.vlanId }} · {{ network.subnet }}/{{ network.prefix }} · {{ network.netmask }}</p>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>{{ t('ipam.allocations') }}</span>
          <UButton size="sm" color="green" @click="allocationPanel = true">{{ t('common.create') }}</UButton>
        </div>
      </template>
      <div class="space-y-2">
        <div v-for="item in network.allocations" :key="item.id" class="flex items-center justify-between rounded border p-2 dark:border-gray-800">
          <div>
            <p class="font-medium">{{ item.ipAddress }} - {{ item.hostname }}</p>
            <p class="text-xs text-gray-500">{{ item.serviceName }}</p>
          </div>
          <UButton size="xs" color="red" variant="soft" @click="removeAllocation(item.id)">{{ t('common.delete') }}</UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>{{ t('ipam.ranges') }}</span>
          <UButton size="sm" color="green" @click="rangePanel = true">{{ t('common.create') }}</UButton>
        </div>
      </template>
      <div class="space-y-2">
        <div v-for="item in network.ranges" :key="item.id" class="rounded border p-2 dark:border-gray-800">
          <p class="font-medium">{{ item.name }} ({{ item.type }})</p>
          <p class="text-sm text-gray-500">{{ item.startIp }} - {{ item.endIp }}</p>
        </div>
      </div>
    </UCard>

    <USlideover v-model="allocationPanel">
      <UCard>
        <template #header>{{ t('ipam.createAllocation') }}</template>
        <div class="grid gap-3">
          <UInput v-model="allocationForm.ipAddress" :placeholder="t('ipam.fields.ipAddress')" />
          <UInput v-model="allocationForm.hostname" :placeholder="t('ipam.fields.hostname')" />
          <UInput v-model="allocationForm.serviceName" :placeholder="t('ipam.fields.serviceName')" />
          <UInput v-model="allocationForm.deviceName" :placeholder="t('ipam.fields.deviceName')" />
        </div>
        <template #footer><UButton color="green" @click="createAllocation">{{ t('common.save') }}</UButton></template>
      </UCard>
    </USlideover>

    <USlideover v-model="rangePanel">
      <UCard>
        <template #header>{{ t('ipam.createRange') }}</template>
        <div class="grid gap-3">
          <UInput v-model="rangeForm.name" :placeholder="t('ipam.fields.name')" />
          <USelectMenu v-model="rangeForm.type" :options="['dhcp','reserved','static','infrastructure']" />
          <UInput v-model="rangeForm.startIp" :placeholder="t('ipam.fields.startIp')" />
          <UInput v-model="rangeForm.endIp" :placeholder="t('ipam.fields.endIp')" />
        </div>
        <template #footer><UButton color="green" @click="createRange">{{ t('common.save') }}</UButton></template>
      </UCard>
    </USlideover>
  </div>
</template>
