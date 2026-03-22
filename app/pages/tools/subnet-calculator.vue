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
