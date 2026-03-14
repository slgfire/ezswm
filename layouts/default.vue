<script setup lang="ts">
const { t, locale, locales } = useI18n()

const navigation = computed(() => [
  {
    label: t('navigation.operations'),
    children: [{ label: t('navigation.dashboard'), to: '/' }]
  },
  {
    label: t('navigation.switching'),
    children: [{ label: t('navigation.switches'), to: '/switches' }]
  },
  {
    label: t('navigation.network'),
    children: [{ label: t('navigation.networks'), to: '/networks' }]
  },
  {
    label: t('navigation.system'),
    children: [{ label: t('navigation.settings'), to: '/settings' }]
  }
])

const localeOptions = computed(() => locales.value.map(item => ({
  label: item.name,
  value: item.code
})))
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <div class="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
      <UCard class="h-fit lg:sticky lg:top-4">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">ezSWM</p>
              <h1 class="text-lg font-semibold">{{ t('common.appName') }}</h1>
            </div>
            <UColorModeButton />
          </div>
        </template>

        <UNavigationMenu orientation="vertical" :items="navigation" />

        <template #footer>
          <USelectMenu v-model="locale" :options="localeOptions" value-attribute="value" option-attribute="label" />
        </template>
      </UCard>

      <div class="space-y-4">
        <slot />
        <footer class="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center justify-between">
            <span>ezSWM</span>
            <a href="https://github.com" target="_blank" rel="noopener" class="hover:text-green-500">GitHub</a>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>
