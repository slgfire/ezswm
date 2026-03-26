<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-dark">
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
        <h2 class="font-display text-3xl font-bold">
          <span class="text-primary-500">ez</span><span class="text-gray-900 dark:text-white">SWM</span>
        </h2>
        <p class="mt-1 font-mono text-sm text-gray-400 dark:text-gray-500">Switch &amp; IP Management</p>
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

  if (!(document as any).startViewTransition) {
    colorMode.preference = switchingToDark ? 'dark' : 'light'
    return
  }

  const transition = (document as any).startViewTransition(() => {
    colorMode.preference = switchingToDark ? 'dark' : 'light'
  })

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`
    ]
    document.documentElement.animate(
      { clipPath: switchingToDark ? [...clipPath].reverse() : clipPath },
      {
        duration: 500,
        easing: 'ease-in-out',
        pseudoElement: switchingToDark ? '::view-transition-old(root)' : '::view-transition-new(root)',
      }
    )
  })
}
</script>
