<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <div class="max-w-7xl mx-auto px-4 py-6">
      <header class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">{{ t('app.title') }}</h1>
          <p class="text-sm text-gray-500">{{ t('app.subtitle') }}</p>
        </div>
        <USelectMenu v-model="locale" :options="locales" option-attribute="label" value-attribute="value" class="w-32" />
      </header>

      <div class="grid grid-cols-12 gap-6">
        <aside class="col-span-12 md:col-span-3 lg:col-span-2">
          <UCard>
            <template #header><p class="font-semibold">{{ t('nav.operations') }}</p></template>
            <UVerticalNavigation :links="operationsLinks" />
            <template #footer>
              <p class="font-semibold mb-2">{{ t('nav.switching') }}</p>
              <UVerticalNavigation :links="switchingLinks" />
              <p class="font-semibold my-2">{{ t('nav.network') }}</p>
              <UVerticalNavigation :links="networkLinks" />
              <p class="font-semibold my-2">{{ t('nav.system') }}</p>
              <UVerticalNavigation :links="systemLinks" />
            </template>
          </UCard>
        </aside>
        <main class="col-span-12 md:col-span-9 lg:col-span-10">
          <slot />
        </main>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const locales = [{ label: 'English', value: 'en' }, { label: 'Deutsch', value: 'de' }]
const operationsLinks = [{ label: t('nav.dashboard'), to: '/' }]
const switchingLinks = [{ label: t('nav.switches'), to: '/switches' }]
const networkLinks = [{ label: t('nav.networks'), to: '/networks' }]
const systemLinks = [{ label: t('nav.settings'), to: '/settings' }]
</script>
