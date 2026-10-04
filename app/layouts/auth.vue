<template>
  <div class="flex min-h-screen items-center justify-center bg-muted px-4 dark:bg-dark">
    <!-- Theme toggle -->
    <div class="absolute right-4 top-4">
      <ClientOnly>
        <UButton
          variant="ghost"
          color="neutral"
          :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
          :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
          @click="toggleWithTransition"
        />
        <template #fallback>
          <div class="size-8" />
        </template>
      </ClientOnly>
    </div>

    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h2 class="mx-auto w-full max-w-[min(calc(100vw_-_7rem),18rem)]">
          <img src="/logo.svg" alt="ezSWM" width="2172" height="724" class="block h-auto w-full max-w-full object-contain dark:hidden">
          <img src="/logo-dark.svg" alt="ezSWM" width="2172" height="724" class="hidden h-auto w-full max-w-full object-contain dark:block">
        </h2>
        <p class="mt-1 font-mono text-sm text-muted">Switch &amp; IP Management</p>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggleWithTransition(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  const switchingToDark = !isDark.value

  if (!(document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }).startViewTransition) {
    colorMode.preference = switchingToDark ? 'dark' : 'light'
    return
  }

  const transition = (document as Document & { startViewTransition: (cb: () => void) => { ready: Promise<void> } }).startViewTransition(() => {
    colorMode.preference = switchingToDark ? 'dark' : 'light'
  })

  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
      {
        duration: 500,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      }
    )
  })
}
</script>
