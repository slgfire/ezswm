<template>
  <div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar (desktop) -->
    <div class="hidden lg:flex">
      <LayoutAppSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
    </div>

    <!-- Mobile sidebar overlay -->
    <div v-if="mobileSidebarOpen" class="fixed inset-0 z-40 lg:hidden">
      <div class="absolute inset-0 bg-black/50" @click="mobileSidebarOpen = false" />
      <div class="relative z-50 h-full w-64">
        <LayoutAppSidebar :collapsed="false" @toggle="mobileSidebarOpen = false" />
      </div>
    </div>

    <!-- Main content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <LayoutAppHeader @toggle-sidebar="mobileSidebarOpen = !mobileSidebarOpen" />
      <LayoutAppBreadcrumbs />

      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>

      <LayoutAppFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
</script>
