<script setup lang="ts">
const sidebarOpen = ref(false)
const colorMode = useColorMode()

if (colorMode.preference === 'system') {
  colorMode.preference = 'dark'
}

const closeSidebar = () => {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
    <div class="relative min-h-screen lg:pl-72">
      <aside
        class="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-default/70 bg-[var(--ui-bg-elevated)]/95 lg:flex"
      >
        <div class="border-b border-default/70 p-5">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 rounded-xl border border-default/70 bg-default/40 p-3 transition hover:bg-default/60"
          >
            <span class="flex size-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <UIcon name="i-lucide-network" class="size-5" />
            </span>
            <span>
              <p class="text-sm font-semibold text-highlighted">ezSWM</p>
              <p class="text-xs text-toned">Easy Switch and IP Management</p>
            </span>
          </NuxtLink>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
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
        <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-black/65 lg:hidden" @click="closeSidebar" />
      </Transition>

      <aside
        :class="[
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-default/70 bg-[var(--ui-bg-elevated)] p-4 transition-transform duration-200 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        ]"
      >
        <div class="mb-4 flex items-center justify-between rounded-xl border border-default/70 bg-default/40 p-3">
          <NuxtLink to="/" class="flex items-center gap-3" @click="closeSidebar">
            <span class="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <UIcon name="i-lucide-network" class="size-5" />
            </span>
            <span>
              <p class="text-sm font-semibold text-highlighted">ezSWM</p>
              <p class="text-xs text-toned">Easy Switch and IP Management</p>
            </span>
          </NuxtLink>
          <UButton icon="i-lucide-x" variant="ghost" size="sm" @click="closeSidebar" />
        </div>

        <div class="h-[calc(100%-72px)] overflow-y-auto" @click="closeSidebar">
          <AppSidebar />
        </div>
      </aside>

      <div class="relative flex min-h-screen flex-col">
        <AppHeader @toggle-sidebar="sidebarOpen = true" />

        <main class="flex-1 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
          <div class="mx-auto w-full max-w-7xl">
            <slot />
          </div>
        </main>

        <AppFooter class="mx-4 mb-4 mt-auto rounded-xl border border-default/80 bg-default/20 sm:mx-6 lg:mx-8" />
      </div>
    </div>
  </div>
</template>
