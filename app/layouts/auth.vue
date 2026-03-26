<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-dark">
    <!-- Theme toggle -->
    <div class="absolute right-4 top-4">
      <ClientOnly>
        <UColorModeSwitch />
        <template #fallback>
          <div class="h-5 w-9" />
        </template>
      </ClientOnly>
    </div>

    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h2 class="font-display text-3xl font-bold">
          <span class="text-primary-500">ez</span><span class="text-gray-900 dark:text-white">SWM</span>
        </h2>
        <p class="mt-1 font-mono text-sm text-gray-400 dark:text-gray-500">Switch &amp; IP Management</p>
      </div>
      <slot />
    </div>
  </div>
</template>
