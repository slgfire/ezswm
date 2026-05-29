<template>
  <UModal v-model:open="open" :title="$t('changelog.title')">
    <template #body>
      <div v-if="failed || (loaded && releases.length === 0)" class="text-sm text-neutral-400">
        {{ $t('changelog.unavailable') }}
      </div>

      <div v-else class="space-y-4">
        <UAlert
          v-if="updateAvailable && newest"
          color="primary"
          variant="subtle"
          :title="$t('changelog.whatsNew')"
        >
          <template #description>
            <div class="changelog-body" v-html="newest.html" />
          </template>
        </UAlert>

        <div class="max-h-[50vh] space-y-4 overflow-y-auto">
          <div
            v-for="rel in listReleases"
            :key="rel.version"
            class="border-b border-default pb-3 last:border-b-0"
          >
            <div class="mb-1 flex items-baseline gap-2">
              <span class="font-mono font-semibold text-gray-900 dark:text-white">v{{ rel.version }}</span>
              <span class="text-xs text-neutral-500">{{ formatDate(rel.published_at) }}</span>
            </div>
            <div class="changelog-body text-sm" v-html="rel.html" />
          </div>
        </div>

        <a
          :href="releasesWebUrl"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 text-sm text-primary-500 hover:underline"
        >
          {{ $t('changelog.viewAll') }}
          <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
        </a>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const { releases, loaded, failed, updateAvailable, load } = useVersionCheck()

// Same repo as the API endpoint; hardcoded here to avoid importing the
// server util (which pulls in `marked`) into the client bundle.
const releasesWebUrl = 'https://github.com/slgfire/ezswm/releases'

const newest = computed(() => releases.value[0])

const listReleases = computed(() => {
  // When the "What's new?" alert shows the newest, skip it in the list.
  const start = updateAvailable.value ? 1 : 0
  return releases.value.slice(start, start + 6)
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

watch(open, (isOpen) => {
  if (isOpen) load()
})
</script>

<style scoped>
.changelog-body :where(h1, h2, h3) {
  font-weight: 600;
  margin: 0.5rem 0 0.25rem;
}
.changelog-body :where(h1) { font-size: 1rem; }
.changelog-body :where(h2) { font-size: 0.95rem; }
.changelog-body :where(h3) { font-size: 0.9rem; }
.changelog-body :where(ul, ol) {
  padding-left: 1.25rem;
  margin: 0.25rem 0;
  list-style: disc;
}
.changelog-body :where(ol) { list-style: decimal; }
.changelog-body :where(li) { margin: 0.125rem 0; }
.changelog-body :where(p) { margin: 0.25rem 0; }
.changelog-body :where(a) { color: var(--ui-primary); text-decoration: underline; }
.changelog-body :where(code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 0.1em 0.3em;
  border-radius: 0.25rem;
  background: rgb(255 255 255 / 0.08);
}
.changelog-body :where(strong) { font-weight: 600; }
</style>
