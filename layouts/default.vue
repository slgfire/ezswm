<script setup lang="ts">
const sidebarOpen = ref(false)

const closeSidebar = () => {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
    <div class="flex min-h-screen">
      <aside class="hidden w-72 shrink-0 border-r border-default/80 bg-elevated/40 lg:flex lg:flex-col">
        <div class="border-b border-default/80 p-4">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 rounded-lg border border-default/70 bg-default/70 px-3 py-2"
          >
            <span class="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
              <UIcon name="i-lucide-network" class="size-5" />
            </span>
            <span>
              <p class="text-sm font-semibold text-highlighted">ezSWM</p>
              <p class="text-xs text-muted">Easy Switch and IP Management</p>
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
        <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-black/60 lg:hidden" @click="closeSidebar" />
      </Transition>

      <aside
        :class="[
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-default/80 bg-[var(--ui-bg)] transition-transform duration-200 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        ]"
      >
        <div class="border-b border-default/80 p-4">
          <div class="flex items-start justify-between gap-2">
            <NuxtLink
              to="/"
              class="flex items-center gap-3 rounded-lg border border-default/70 bg-default/70 px-3 py-2"
              @click="closeSidebar"
            >
              <span class="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                <UIcon name="i-lucide-network" class="size-5" />
              </span>
              <span>
                <p class="text-sm font-semibold text-highlighted">ezSWM</p>
                <p class="text-xs text-muted">Easy Switch and IP Management</p>
              </span>
            </NuxtLink>
            <UButton icon="i-lucide-x" variant="ghost" size="sm" @click="closeSidebar" />
          </div>
        </div>

        <div class="h-[calc(100%-88px)] overflow-y-auto p-4" @click="closeSidebar">
          <AppSidebar />
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <AppHeader @toggle-sidebar="sidebarOpen = true" />

        <main class="flex-1 p-4 sm:p-6">
          <div class="mx-auto w-full max-w-[1500px]">
            <slot />
          </div>
        </main>

        <AppFooter class="mx-4 mb-4 mt-auto rounded-xl border border-default/80 bg-default/40 sm:mx-6" />
      </div>
    </div>
  </div>
</template>
