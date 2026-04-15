<template>
  <div class="space-y-4">
    <!-- Error banner when no internet -->
    <UAlert v-if="error" color="error" :title="error" icon="i-heroicons-exclamation-triangle" />

    <!-- Search input -->
    <UInput
      v-model="searchQuery"
      :placeholder="$t('templates.searchDevices')"
      icon="i-heroicons-magnifying-glass"
      :loading="searching"
      class="w-full"
    />

    <!-- Results list -->
    <div v-if="results.length > 0" class="space-y-1 max-h-64 overflow-y-auto">
      <button
        v-for="item in results"
        :key="`${item.manufacturer}/${item.slug}`"
        class="w-full text-left px-3 py-2 rounded-md row-hover flex items-center justify-between"
        :class="{ 'bg-primary/10': selected?.slug === item.slug }"
        @click="selectDevice(item)"
      >
        <span>
          <span class="font-medium">{{ item.manufacturer }}</span>
          <span class="text-dimmed ml-2">{{ item.slug }}</span>
        </span>
      </button>
    </div>

    <!-- No results -->
    <p v-else-if="searchQuery.length >= 2 && !searching && !error" class="text-dimmed text-sm">
      {{ $t('templates.noResults', { query: searchQuery }) }}
    </p>

    <!-- Preview -->
    <div v-if="preview" class="space-y-4 border border-default rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold">{{ preview.name }}</h3>
          <p class="text-sm text-dimmed">
            {{ preview.manufacturer }} — {{ preview.model }}
            <span v-if="preview.airflow" class="ml-2">| {{ $t(`airflowOptions.${preview.airflow}`) }}</span>
          </p>
          <a v-if="preview.datasheet_url" :href="preview.datasheet_url" target="_blank" class="text-sm text-primary hover:underline">
            {{ $t('templates.datasheetUrl') }} ↗
          </a>
        </div>
        <UButton :label="$t('templates.importDevice')" color="primary" @click="$emit('import', preview)" />
      </div>

      <UAlert
        v-if="skippedInterfaces.length > 0"
        color="warning"
        icon="i-heroicons-exclamation-triangle"
        :title="$t('templates.skippedInterfacesTitle')"
        :description="skippedDescription"
      />

      <SwitchPortGrid
        v-if="previewPorts.length > 0"
        :ports="previewPorts"
        :units="preview.units"
        :selected-ports="[]"
      />
    </div>

    <!-- Loading preview -->
    <div v-if="loadingPreview" class="flex items-center justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  import: [template: any]
}>()

const { t } = useI18n()

const searchQuery = ref('')
const results = ref<{ manufacturer: string; slug: string; model: string }[]>([])
const searching = ref(false)
const error = ref('')
const selected = ref<{ manufacturer: string; slug: string } | null>(null)
const preview = ref<any>(null)
const previewPorts = ref<any[]>([])
const loadingPreview = ref(false)
const skippedInterfaces = ref<{ type: string; count: number }[]>([])

const skippedDescription = computed(() => {
  if (skippedInterfaces.value.length === 0) return ''
  const total = skippedInterfaces.value.reduce((s, i) => s + i.count, 0)
  const details = skippedInterfaces.value.map(i => `${i.count}x ${i.type}`).join(', ')
  return t('templates.skippedInterfacesDescription', { count: total, details })
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  error.value = ''
  preview.value = null
  selected.value = null
  skippedInterfaces.value = []

  if (val.trim().length < 2) {
    results.value = []
    return
  }

  searching.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const data = await $fetch('/api/device-library/search', { params: { q: val } })
      results.value = (data as any).items
    } catch (e: any) {
      if (e.statusCode === 503) {
        error.value = t('templates.libraryUnavailable')
      }
      results.value = []
    } finally {
      searching.value = false
    }
  }, 300)
})

async function selectDevice(item: { manufacturer: string; slug: string }) {
  selected.value = item
  loadingPreview.value = true
  preview.value = null
  previewPorts.value = []
  skippedInterfaces.value = []

  try {
    const data = await $fetch('/api/device-library/device', {
      params: { manufacturer: item.manufacturer, slug: item.slug }
    })
    preview.value = (data as any).template
    skippedInterfaces.value = (data as any).skippedInterfaces || []

    // Generate preview ports for visualization
    const ports: any[] = []
    let portId = 0
    for (const unit of (data as any).template.units ?? []) {
      for (const block of unit.blocks ?? []) {
        for (let i = 0; i < block.count; i++) {
          ports.push({
            id: String(portId++),
            unit: unit.unit_number,
            index: block.start_index + i,
            type: block.type,
            speed: block.default_speed,
            status: 'down',
            tagged_vlans: [],
            poe: block.poe ?? undefined,
          })
        }
      }
    }
    previewPorts.value = ports
  } catch (e: any) {
    if (e.statusCode === 503) {
      error.value = t('templates.libraryUnavailable')
    }
  } finally {
    loadingPreview.value = false
  }
}
</script>
