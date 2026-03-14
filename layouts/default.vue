<template>
  <div class="min-h-screen bg-default">
    <div class="grid min-h-screen grid-cols-12">
      <aside class="col-span-12 border-r border-default p-4 md:col-span-3 lg:col-span-2">
        <NuxtLink to="/" class="mb-6 block text-xl font-bold text-primary">ezSWM</NuxtLink>
        <AppSidebar />
      </aside>

      <div class="col-span-12 flex min-h-screen flex-col md:col-span-9 lg:col-span-10">
        <AppHeader />
        <main class="flex-1 px-4 py-6">
          <div class="mx-auto w-full max-w-7xl">
            <slot />
          </div>
        </main>
        <AppFooter />
      </div>
    </div>
  </div>
</template>
