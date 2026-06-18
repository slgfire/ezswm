<template>
  <UDashboardGroup unit="rem">
    <!-- Skip to main content (a11y) -->
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-white focus:outline-none">
      Skip to main content
    </a>

    <LayoutAppSidebar />

    <div class="flex flex-1 flex-col overflow-hidden">
      <LayoutAppHeader />
      <LayoutAppBreadcrumbs />
      <main id="main-content" class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>

    <LayoutChangelogModal v-model:open="changelogOpen" />
  </UDashboardGroup>
</template>

<script setup lang="ts">
const changelogOpen = useState('changelog-open', () => false)
</script>
