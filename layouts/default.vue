<script setup lang="ts">
const sidebarOpen = ref(false)

const closeSidebar = () => {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-default">
    <div class="flex min-h-screen">
      <aside class="hidden w-72 shrink-0 border-r border-default bg-default lg:flex lg:flex-col">
        <div class="border-b border-default px-6 py-4">
          <NuxtLink to="/" class="text-lg font-semibold text-highlighted">ezSWM</NuxtLink>
          <p class="text-xs text-muted">Easy Switch and IP Management</p>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-5">
          <AppSidebar />
        </div>
      </aside>

      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-black/50 lg:hidden" @click="closeSidebar" />
      </Transition>

      <aside
        :class="[
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-default bg-default transition-transform duration-200 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        ]"
      >
        <div class="border-b border-default px-6 py-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <NuxtLink to="/" class="text-lg font-semibold text-highlighted" @click="closeSidebar">ezSWM</NuxtLink>
              <p class="text-xs text-muted">Easy Switch and IP Management</p>
            </div>
            <UButton icon="i-lucide-x" variant="ghost" size="sm" @click="closeSidebar" />
          </div>
        </div>

        <div class="h-[calc(100%-73px)] overflow-y-auto px-4 py-5" @click="closeSidebar">
          <AppSidebar />
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <AppHeader @toggle-sidebar="sidebarOpen = true" />

        <main class="flex-1 p-4 sm:p-6">
          <div class="mx-auto w-full max-w-[1400px]">
            <slot />
          </div>
        </main>

        <AppFooter class="mx-4 mb-4 mt-auto rounded-lg border border-default sm:mx-6" />
      </div>
    </div>
  </div>
</template>
