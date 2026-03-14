<template>
  <div class="min-h-screen">
    <div class="mx-auto max-w-[1600px] p-4 lg:p-6">
      <div class="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <aside>
          <AppSidebar />
        </aside>

        <main>
          <AppHeader class="mb-4" />
          <slot />
          <AppFooter />
        </main>
      </div>
    </div>
  </div>
</template>
