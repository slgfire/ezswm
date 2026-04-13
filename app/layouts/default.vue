<template>
  <div class="flex h-screen overflow-hidden bg-elevated">
    <!-- Skip to main content (a11y) -->
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-white focus:outline-none">
      Skip to main content
    </a>

    <!-- Sidebar (desktop) -->
    <div class="hidden lg:flex">
      <LayoutAppSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
    </div>

    <!-- Mobile sidebar overlay -->
    <div v-if="mobileSidebarOpen" data-testid="mobile-sidebar-overlay" class="fixed inset-0 z-40 lg:hidden">
      <div class="absolute inset-0 bg-black/50" @click="mobileSidebarOpen = false" />
      <div class="relative z-50 h-full w-64">
        <LayoutAppSidebar :collapsed="false" @toggle="mobileSidebarOpen = false" />
      </div>
    </div>

    <!-- Main content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <LayoutAppHeader ref="headerRef" @toggle-sidebar="mobileSidebarOpen = !mobileSidebarOpen" />
      <LayoutAppBreadcrumbs />

      <main id="main-content" class="flex-1 overflow-y-auto">
        <slot />
      </main>

      <LayoutAppFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const headerRef = ref<{ dismissSearch: () => void; isSearchOpen: boolean } | null>(null)

function onGlobalEsc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return

  // 1. Search results open → dismiss (hide results, keep query)
  if (headerRef.value?.isSearchOpen) {
    headerRef.value.dismissSearch()
    return
  }

  // 2. Mobile sidebar open → close it
  if (mobileSidebarOpen.value) {
    mobileSidebarOpen.value = false
    return
  }

  // 3. Otherwise: let Nuxt UI handle modals/slideovers natively
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalEsc)
})
</script>
