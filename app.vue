<template>
  <UApp>
    <div class="min-h-screen bg-gray-950 text-gray-100">
      <div class="mx-auto flex max-w-screen-2xl">
        <aside class="hidden w-72 border-r border-gray-800 bg-gray-900/70 p-4 lg:block">
          <div class="mb-6 text-lg font-semibold">ezSWM</div>
          <UNavigationMenu orientation="vertical" :items="navItems" class="w-full" />
        </aside>

        <main class="min-h-screen flex-1">
          <header class="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/90 px-4 py-3 backdrop-blur">
            <div class="flex items-center justify-between gap-4">
              <h1 class="text-lg font-semibold">Easy Switch and IP Management</h1>
              <div class="w-full max-w-lg">
                <UInput v-model="query" icon="i-lucide-search" placeholder="Global search" @update:model-value="runSearch" />
                <UCard v-if="query && results.length" class="mt-2">
                  <ul class="space-y-2 text-sm">
                    <li v-for="item in results" :key="`${item.type}-${item.id}`">
                      <NuxtLink class="text-primary hover:underline" :to="item.to">{{ item.label }}</NuxtLink>
                    </li>
                  </ul>
                </UCard>
              </div>
            </div>
          </header>
          <NuxtPage />
        </main>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
const navItems = [
  [{ label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' }],
  [{ label: 'Switches', icon: 'i-lucide-server', to: '/switches' }],
  [{ label: 'Networks', icon: 'i-lucide-network', to: '/networks' }],
  [{ label: 'Settings', icon: 'i-lucide-settings', to: '/settings' }]
]

const query = ref('')
const results = ref<{ type: string, id: string, label: string, to: string }[]>([])

const runSearch = useDebounceFn(async () => {
  if (!query.value) {
    results.value = []
    return
  }
  results.value = await $fetch('/api/search', { query: { q: query.value } })
}, 200)
</script>
