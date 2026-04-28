<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('tools.subnetCalculator.title') }}</h1>

    <div class="max-w-xl">
      <UFormField :label="$t('tools.subnetCalculator.inputLabel')">
        <UInput
          v-model="cidr"
          :placeholder="$t('tools.subnetCalculator.inputPlaceholder')"
          size="lg"
        />
      </UFormField>

      <UCard v-if="result" class="mt-6">
        <template #header>
          <div class="flex items-center gap-2">
            <h2 class="font-semibold">{{ $t('tools.subnetCalculator.results') }}</h2>
            <UBadge v-if="result.prefix_length === 31" variant="subtle" color="info" size="xs">Point-to-Point</UBadge>
            <UBadge v-else-if="result.prefix_length === 32" variant="subtle" color="warning" size="xs">Host Route</UBadge>
          </div>
        </template>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <!-- /32: Host Address only -->
          <template v-if="result.prefix_length === 32">
            <div><span class="text-gray-400">{{ $t('networks.subnetInfo.hostAddress') }}:</span></div>
            <div>{{ result.network_address }}</div>
          </template>
          <!-- /31: Endpoint A + B -->
          <template v-else-if="result.prefix_length === 31">
            <div><span class="text-gray-400">{{ $t('networks.subnetInfo.endpointA') }}:</span></div>
            <div>{{ result.network_address }}</div>
            <div><span class="text-gray-400">{{ $t('networks.subnetInfo.endpointB') }}:</span></div>
            <div>{{ result.broadcast_address }}</div>
          </template>
          <!-- Normal subnets -->
          <template v-else>
            <div><span class="text-gray-400">{{ $t('networks.subnetInfo.networkAddress') }}:</span></div>
            <div>{{ result.network_address }}</div>
            <div><span class="text-gray-400">{{ $t('networks.subnetInfo.broadcastAddress') }}:</span></div>
            <div>{{ result.broadcast_address }}</div>
          </template>
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.subnetMask') }}:</span></div>
          <div>{{ result.subnet_mask }}</div>
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.wildcardMask') }}:</span></div>
          <div>{{ result.wildcard_mask }}</div>
          <template v-if="result.prefix_length < 31">
            <div><span class="text-gray-400">{{ $t('networks.subnetInfo.firstUsable') }}:</span></div>
            <div>{{ result.first_usable }}</div>
            <div><span class="text-gray-400">{{ $t('networks.subnetInfo.lastUsable') }}:</span></div>
            <div>{{ result.last_usable }}</div>
          </template>
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.totalHosts') }}:</span></div>
          <div>{{ result.total_hosts }}</div>
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.usableHosts') }}:</span></div>
          <div>{{ result.usable_hosts }}</div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Subnet Calculator' })

const cidr = ref('')
interface SubnetResult {
  cidr: string
  network_address: string
  broadcast_address: string
  subnet_mask: string
  wildcard_mask: string
  first_usable: string
  last_usable: string
  total_hosts: number
  usable_hosts: number
  prefix_length: number
}

const result = ref<SubnetResult | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestId = 0

watch(cidr, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)

  if (!val || !val.includes('/')) {
    requestId++
    result.value = null
    return
  }

  debounceTimer = setTimeout(async () => {
    const currentId = ++requestId
    try {
      const data = await $fetch('/api/subnet-calculator', { params: { cidr: val } })
      if (currentId === requestId) {
        result.value = data
      }
    } catch {
      if (currentId === requestId) {
        result.value = null
      }
    }
  }, 150)
})
</script>
