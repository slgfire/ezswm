<template>
  <ClientOnly>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="flex min-h-[60vh] items-center justify-center">
      <div class="text-center text-gray-500">
        <UIcon name="i-heroicons-arrow-path" class="mb-2 h-8 w-8 animate-spin" />
        <p class="text-sm">{{ $t('public.loading') }}</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex min-h-[60vh] items-center justify-center">
      <div class="text-center text-gray-500">
        <UIcon name="i-heroicons-exclamation-circle" class="mb-2 h-12 w-12 text-gray-600" />
        <p class="text-sm">{{ $t('public.error') }}</p>
      </div>
    </div>

    <!-- Success -->
    <div v-else-if="data" class="space-y-4">
      <!-- Header -->
      <div class="text-center">
        <div class="text-[10px] uppercase tracking-widest text-gray-600">ezSWM</div>
        <h1 class="mt-1 text-xl font-bold text-gray-100">{{ data.name }}</h1>
        <p v-if="data.model || data.location" class="mt-0.5 text-sm text-gray-500">
          <span v-if="data.model">{{ data.model }}</span>
          <span v-if="data.model && data.location"> · </span>
          <span v-if="data.location">{{ data.location }}</span>
        </p>
      </div>

      <!-- Port Grid: desktop only -->
      <div class="hidden md:block overflow-x-auto">
        <SwitchPortGrid
          :ports="data.ports"
          :units="data.units"
          :vlans="data.vlans"
          :selected-ports="[]"
          :public-mode="true"
        />
      </div>

      <!-- VLAN Legend: desktop only (technical) -->
      <div v-if="data.vlans.length" class="hidden md:flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <div v-for="vlan in data.vlans" :key="vlan.vlan_id" class="flex items-center gap-1.5">
          <div class="h-2.5 w-2.5 rounded-sm" :style="{ backgroundColor: vlan.color }" />
          <span class="text-gray-400">VLAN {{ vlan.vlan_id }}</span>
          <span class="text-gray-500">{{ vlan.name }}</span>
        </div>
      </div>

      <!-- Port List (always visible, VLAN-focused) -->
      <PublicPortList :ports="data.ports" :vlans="data.vlans" />

      <!-- Footer -->
      <div class="border-t border-gray-800 pt-4 text-center text-[10px] text-gray-600">
        <div>{{ $t('public.footer') }}</div>
        <div class="mt-0.5 text-gray-700">
          {{ $t('public.lastUpdated', { date: new Date(data.updated_at).toLocaleString() }) }}
        </div>
      </div>
    </div>
  </div>
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'public' })

const route = useRoute()
const tokenStr = route.params.token as string

useHead({ title: 'Switch Port Map' })

const { data, pending, error } = useFetch(`/api/p/${tokenStr}`, { server: false })
</script>
