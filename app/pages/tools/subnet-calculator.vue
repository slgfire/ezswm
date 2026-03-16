<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('tools.subnetCalculator.title') }}</h1>

    <div class="max-w-xl">
      <UFormGroup :label="$t('tools.subnetCalculator.inputLabel')">
        <UInput
          v-model="cidr"
          :placeholder="$t('tools.subnetCalculator.inputPlaceholder')"
          size="lg"
          @input="calculate"
        />
      </UFormGroup>

      <UCard v-if="result" class="mt-6">
        <template #header><h2 class="font-semibold">{{ $t('tools.subnetCalculator.results') }}</h2></template>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.networkAddress') }}:</span></div>
          <div>{{ result.network_address }}</div>
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.broadcastAddress') }}:</span></div>
          <div>{{ result.broadcast_address }}</div>
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.subnetMask') }}:</span></div>
          <div>{{ result.subnet_mask }}</div>
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.wildcardMask') }}:</span></div>
          <div>{{ result.wildcard_mask }}</div>
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.firstUsable') }}:</span></div>
          <div>{{ result.first_usable }}</div>
          <div><span class="text-gray-400">{{ $t('networks.subnetInfo.lastUsable') }}:</span></div>
          <div>{{ result.last_usable }}</div>
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
const cidr = ref('')
const result = ref<any>(null)

async function calculate() {
  if (!cidr.value || !cidr.value.includes('/')) {
    result.value = null
    return
  }
  try {
    result.value = await $fetch('/api/subnet-calculator', { params: { cidr: cidr.value } })
  } catch {
    result.value = null
  }
}
</script>
