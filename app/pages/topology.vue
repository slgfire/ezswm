<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('topology.title') }}</h1>
    <UCard>
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <UIcon name="i-heroicons-share" class="mb-4 h-16 w-16 text-gray-500" />
        <h2 class="mb-2 text-xl font-semibold text-gray-300">Coming Soon</h2>
        <p class="max-w-md text-sm text-gray-500">
          Interactive network topology diagram showing switch-to-switch connections
          based on port links. Auto-layout, clickable nodes, and VLAN edge labels.
        </p>
        <UBadge class="mt-4" color="yellow" variant="subtle">
          In Development
        </UBadge>
      </div>
    </UCard>
  </div>
</template>
