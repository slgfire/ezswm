<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('switches.title') }}</h1>
      <UButton to="/switches/create" icon="i-heroicons-plus" size="sm">
        {{ $t('switches.create') }}
      </UButton>
    </div>

    <!-- Toolbar -->
    <div v-if="!loading && allItems.length > 0" class="mb-4 flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        :placeholder="$t('common.search')"
        icon="i-heroicons-magnifying-glass"
        size="sm"
        class="w-64"
      />
      <USelectMenu :search-input="false"
        v-if="locationOptions.length > 1"
        v-model="locationFilter"
        :items="locationOptions"
        value-key="value"
        
        :placeholder="$t('switches.allLocations')"
        size="sm"
        class="w-48"
      />
      <USelectMenu :search-input="false"
        v-model="roleFilter"
        :items="roleOptions"
        value-key="value"
        
        :placeholder="$t('switches.allRoles')"
        size="sm"
        class="w-44"
      />
      <USelectMenu :search-input="false"
        v-if="tagOptions.length > 1"
        v-model="tagFilter"
        :items="tagOptions"
        value-key="value"
        
        :placeholder="$t('switches.allTags')"
        size="sm"
        class="w-44"
      />
      <div class="ml-auto flex items-center gap-1">
        <UTooltip :text="$t('switches.viewGrid')">
          <UButton
            icon="i-heroicons-squares-2x2"
            size="xs"
            :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
            @click="viewMode = 'grid'"
          />
        </UTooltip>
        <UTooltip :text="$t('switches.viewList')">
          <UButton
            icon="i-heroicons-bars-3"
            size="xs"
            :variant="viewMode === 'list' ? 'solid' : 'ghost'"
            @click="viewMode = 'list'"
          />
        </UTooltip>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <!-- Grid View -->
    <ClientOnly v-if="!loading && filteredItems.length > 0 && viewMode === 'grid'">
      <draggable
        v-model="sortedItems"
        item-key="id"
        handle=".drag-handle"
        :animation="200"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        @end="saveSortOrder"
      >
        <template #item="{ element: sw }">
          <NuxtLink
            :to="`/switches/${sw.id}`"
            class="stagger-item card-glow group relative flex flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700/50 dark:bg-dark-100"
          >
            <!-- Hover actions -->
            <div class="absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-white/95 px-1.5 py-1 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-gray-700/95">
              <UButton icon="i-heroicons-bars-2" class="drag-handle cursor-grab active:cursor-grabbing" variant="ghost" color="neutral" size="2xs" @click.prevent />
              <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="2xs" @click.prevent="onDuplicate(sw)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="2xs" @click.prevent="confirmDelete(sw)" />
            </div>

            <!-- Header: Name + Subtitle + Role -->
            <div class="px-5 pt-4 pb-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="truncate font-semibold text-gray-900 group-hover:text-primary-500 dark:text-white" :title="sw.name">
                    {{ sw.name }}
                  </h3>
                  <p v-if="sw.manufacturer || sw.model" class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                    {{ [sw.manufacturer, sw.model].filter(Boolean).join(' · ') }}
                  </p>
                </div>
                <UBadge v-if="sw.role" :color="roleColor(sw.role)" variant="subtle" size="xs" class="shrink-0">
                  {{ $t(`switches.roles.${sw.role}`) }}
                </UBadge>
              </div>
              <!-- Tags -->
              <div v-if="sw.tags?.length" class="mt-2 flex flex-wrap gap-1">
                <UBadge v-for="tg in sw.tags" :key="tg" color="neutral" variant="soft" size="xs">
                  {{ tg }}
                </UBadge>
              </div>
            </div>

            <!-- Info rows -->
            <div class="min-h-[3rem] flex-1 space-y-1.5 px-5 pb-3 text-sm">
              <div v-if="sw.location" class="flex items-center gap-2">
                <UIcon name="i-heroicons-map-pin" class="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                <span class="text-gray-500 dark:text-gray-400">{{ sw.location }}</span>
              </div>
              <div v-if="sw.management_ip" class="flex items-center gap-2">
                <UIcon name="i-heroicons-globe-alt" class="h-3.5 w-3.5 flex-shrink-0 text-teal-400" />
                <span class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ sw.management_ip }}</span>
              </div>
            </div>

            <!-- Ports footer -->
            <div class="mt-auto flex items-center justify-between border-t border-gray-100 px-5 py-2.5 font-mono dark:border-gray-700/50">
              <span class="text-xs font-medium uppercase tracking-wider text-gray-400">{{ sw.ports?.length || 0 }} ports</span>
              <div class="flex items-center gap-3 text-xs">
                <span v-if="getPortStats(sw).up" class="flex items-center gap-1 text-green-500">
                  <span class="inline-block h-2 w-2 rounded-full bg-green-500" />
                  {{ getPortStats(sw).up }}
                </span>
                <span v-if="getPortStats(sw).down" class="flex items-center gap-1 text-gray-400">
                  <span class="inline-block h-2 w-2 rounded-full bg-gray-400" />
                  {{ getPortStats(sw).down }}
                </span>
                <span v-if="getPortStats(sw).disabled" class="flex items-center gap-1 text-red-400">
                  <span class="inline-block h-2 w-2 rounded-full bg-red-400" />
                  {{ getPortStats(sw).disabled }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </template>
      </draggable>
      <template #fallback>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 3" :key="i" class="h-40 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/30" />
        </div>
      </template>
    </ClientOnly>

    <!-- List View -->
    <div v-if="!loading && filteredItems.length > 0 && viewMode === 'list'" class="flex flex-col gap-2">
      <NuxtLink
        v-for="sw in filteredItems"
        :key="sw.id"
        :to="`/switches/${sw.id}`"
        class="stagger-item card-glow group relative flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-3 dark:border-gray-700/50 dark:bg-dark-100"
      >
        <!-- Hover actions -->
        <div class="absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-white/95 px-1.5 py-1 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-gray-700/95">
          <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="2xs" @click.prevent="onDuplicate(sw)" />
          <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="2xs" @click.prevent="confirmDelete(sw)" />
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="truncate font-semibold text-gray-900 dark:text-white">{{ sw.name }}</h3>
            <UBadge v-if="sw.role" :color="roleColor(sw.role)" variant="subtle" size="xs">
              {{ $t(`switches.roles.${sw.role}`) }}
            </UBadge>
            <span v-if="sw.manufacturer || sw.model" class="hidden text-sm text-gray-500 dark:text-gray-400 md:inline">
              {{ [sw.manufacturer, sw.model].filter(Boolean).join(' · ') }}
            </span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
            <span v-if="sw.location" class="flex items-center gap-1">
              <UIcon name="i-heroicons-map-pin" class="h-3 w-3" />
              {{ sw.location }}
            </span>
            <span v-if="sw.management_ip" class="flex items-center gap-1 font-mono">
              <UIcon name="i-heroicons-globe-alt" class="h-3 w-3" />
              {{ sw.management_ip }}
            </span>
            <UBadge v-for="tg in (sw.tags || [])" :key="tg" color="neutral" variant="soft" size="xs">
              {{ tg }}
            </UBadge>
          </div>
        </div>

        <!-- Port Stats (right-aligned) -->
        <div class="hidden shrink-0 text-right sm:block">
          <span class="text-xs font-medium uppercase tracking-wider text-gray-400">{{ sw.ports?.length || 0 }} ports</span>
          <div class="mt-1 flex items-center justify-end gap-3 text-xs">
            <span v-if="getPortStats(sw).up" class="flex items-center gap-1 text-green-500">
              <span class="inline-block h-2 w-2 rounded-full bg-green-500" />
              {{ getPortStats(sw).up }}
            </span>
            <span v-if="getPortStats(sw).down" class="flex items-center gap-1 text-gray-400">
              <span class="inline-block h-2 w-2 rounded-full bg-gray-400" />
              {{ getPortStats(sw).down }}
            </span>
            <span v-if="getPortStats(sw).disabled" class="flex items-center gap-1 text-red-400">
              <span class="inline-block h-2 w-2 rounded-full bg-red-400" />
              {{ getPortStats(sw).disabled }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- No results -->
    <div v-if="!loading && allItems.length > 0 && filteredItems.length === 0" class="py-12 text-center">
      <UIcon name="i-heroicons-funnel" class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('switches.noResults') }}</p>
    </div>

    <!-- Empty state -->
    <SharedEmptyState
      v-if="!loading && allItems.length === 0"
      icon="i-heroicons-server-stack"
      :title="$t('switches.emptyTitle')"
      :description="$t('switches.emptyDescription')"
    >
      <template #action>
        <UButton to="/switches/create" icon="i-heroicons-plus">{{ $t('switches.create') }}</UButton>
      </template>
    </SharedEmptyState>

    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('switches.delete')"
      :message="deleteMessage"
      :confirm-label="$t('common.delete')"
      :loading="deleting"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'

const { t } = useI18n()
const toast = useToast()
const { items, loading, fetch: fetchSwitches, remove, duplicate } = useSwitches()

const viewMode = ref<'grid' | 'list'>('grid')
const search = ref('')
const locationFilter = ref('')
const roleFilter = ref('')
const tagFilter = ref('')
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const deleting = ref(false)
const availableLocations = ref<string[]>([])
const availableTags = ref<string[]>([])

const sortedItems = ref<any[]>([])
const allItems = computed(() => items.value)

const roleOptions = computed(() => [
  { value: '', label: t('switches.allRoles') },
  { value: 'core', label: t('switches.roles.core') },
  { value: 'distribution', label: t('switches.roles.distribution') },
  { value: 'access', label: t('switches.roles.access') },
  { value: 'management', label: t('switches.roles.management') }
])

const locationOptions = computed(() => [
  { value: '', label: t('switches.allLocations') },
  ...availableLocations.value.map(l => ({ value: l, label: l }))
])

const tagOptions = computed(() => [
  { value: '', label: t('switches.allTags') },
  ...availableTags.value.map(tg => ({ value: tg, label: tg }))
])

const filteredItems = computed(() => {
  let result = [...allItems.value]

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((s: any) =>
      s.name?.toLowerCase().includes(q) || s.model?.toLowerCase().includes(q) ||
      s.management_ip?.toLowerCase().includes(q) || s.serial_number?.toLowerCase().includes(q) ||
      s.manufacturer?.toLowerCase().includes(q)
    )
  }

  if (locationFilter.value) {
    result = result.filter((s: any) => s.location === locationFilter.value)
  }

  if (roleFilter.value) {
    result = result.filter((s: any) => s.role === roleFilter.value)
  }

  if (tagFilter.value) {
    result = result.filter((s: any) => s.tags?.includes(tagFilter.value))
  }

  return result
})

watch(items, (newItems) => {
  sortedItems.value = [...newItems]
}, { immediate: true })

watch(filteredItems, (fi) => {
  if (viewMode.value === 'grid') {
    sortedItems.value = fi
  }
})

function roleColor(role: string): string {
  const map: Record<string, string> = {
    core: 'error',
    distribution: 'warning',
    access: 'info',
    management: 'secondary'
  }
  return map[role] || 'neutral'
}

function getPortStats(sw: any) {
  const ports = sw.ports || []
  return {
    up: ports.filter((p: any) => p.status === 'up').length,
    down: ports.filter((p: any) => p.status === 'down').length,
    disabled: ports.filter((p: any) => p.status === 'disabled').length
  }
}

async function saveSortOrder() {
  const order = sortedItems.value.map((s: any) => s.id)
  try {
    await $fetch('/api/switches/sort', { method: 'PUT', body: { order } })
  } catch { /* silent */ }
}

const deleteMessage = computed(() => deleteTarget.value ? `${t('switches.delete')}: ${deleteTarget.value.name}?` : '')

function confirmDelete(row: any) { deleteTarget.value = row; showDeleteDialog.value = true }

async function onDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await remove(deleteTarget.value.id)
    toast.add({ title: t('switches.messages.deleted'), color: 'success' })
    showDeleteDialog.value = false
    await loadData()
  } catch (e: any) { toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deleting.value = false }
}

async function onDuplicate(row: any) {
  try {
    const result = await duplicate(row.id)
    toast.add({ title: t('switches.messages.duplicated'), color: 'success' })
    await loadData()
    if (result && (result as any).id) await navigateTo(`/switches/${(result as any).id}`)
  } catch (e: any) { toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' }) }
}

const { apiFetch } = useApiFetch()

async function loadData() {
  await fetchSwitches()
  try {
    const response = await apiFetch<any>('/api/switches', { params: { per_page: 1 } })
    availableLocations.value = response?.filters?.locations || []
    availableTags.value = response?.filters?.tags || []
  } catch { /* silent */ }
}

onMounted(() => { loadData() })
</script>
