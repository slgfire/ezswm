<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('switches.title') }}</h1>
      <UButton :to="`/sites/${siteId}/switches/create`" icon="i-heroicons-plus" size="sm">
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
      <USelectMenu
v-if="locationOptions.length > 0"
        v-model="locationFilter"
        :search-input="false"
        :items="locationOptions"
        value-key="value"
        
        :placeholder="$t('switches.allLocations')"
        size="sm"
        class="w-48"
      />
      <USelectMenu
v-model="roleFilter"
        :search-input="false"
        :items="roleOptions"
        value-key="value"
        
        :placeholder="$t('switches.allRoles')"
        size="sm"
        class="w-44"
      />
      <USelectMenu
v-if="tagOptions.length > 0"
        v-model="tagFilter"
        :search-input="false"
        :items="tagOptions"
        value-key="value"
        
        :placeholder="$t('switches.allTags')"
        size="sm"
        class="w-44"
      />
      <div class="ml-auto flex items-center gap-2">
        <!-- Print popover with switch checkboxes -->
        <UPopover>
          <UButton icon="i-heroicons-printer" variant="ghost" color="warning" size="xs" />
          <template #content>
            <div class="w-72 p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ $t('common.print') }}</span>
                <div class="flex gap-1">
                  <UButton size="xs" variant="ghost" @click="printSelectedIds.length === filteredItems.length ? (printSelectedIds = []) : (printSelectedIds = filteredItems.map((s: any) => s.id))">
                    {{ printSelectedIds.length === filteredItems.length ? $t('common.deselectAll') : $t('common.selectAll') }}
                  </UButton>
                </div>
              </div>
              <UInput v-model="printSearch" :placeholder="$t('common.search') + '...'" size="xs" class="mb-2 w-full" icon="i-heroicons-magnifying-glass" />
              <div class="max-h-60 overflow-y-auto space-y-0.5">
                <template v-if="siteId === 'all'">
                  <template v-for="group in printFilteredGroups" :key="group.siteId">
                    <div v-if="group.siteName" class="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{{ group.siteName }}</div>
                    <label
                      v-for="sw in group.items"
                      :key="sw.id"
                      class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <input
                        type="checkbox"
                        :checked="printSelectedIds.includes(sw.id)"
                        class="h-3.5 w-3.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        @change="togglePrintId(sw.id)"
                      >
                      <span class="truncate text-xs">{{ sw.name }}</span>
                    </label>
                  </template>
                </template>
                <template v-else>
                  <label
                    v-for="sw in printFilteredItems"
                    :key="sw.id"
                    class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <input
                      type="checkbox"
                      :checked="printSelectedIds.includes(sw.id)"
                      class="h-3.5 w-3.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      @change="togglePrintId(sw.id)"
                    >
                    <span class="truncate text-xs">{{ sw.name }}</span>
                  </label>
                </template>
              </div>
              <div class="mt-2 border-t border-default pt-2">
                <UButton
                  icon="i-heroicons-printer"
                  size="xs"
                  block
                  :disabled="printSelectedIds.length === 0"
                  @click="openPrintPage"
                >
                  {{ $t('print.printSelected', { n: printSelectedIds.length }) }}
                </UButton>
              </div>
            </div>
          </template>
        </UPopover>

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

    <!-- Grid View: Grouped (All Sites) -->
    <template v-if="!loading && filteredItems.length > 0 && viewMode === 'grid' && siteId === 'all'">
      <div v-for="group in groupedItems" :key="group.siteId" class="mb-6">
        <div v-if="groupedItems.length > 1" class="mb-3 flex items-center gap-3">
          <UIcon name="i-heroicons-building-office-2" class="h-4 w-4 text-gray-500" />
          <span class="text-sm font-semibold text-gray-400">{{ group.siteName }}</span>
          <div class="h-px flex-1 bg-default" />
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="sw in group.items"
            :key="sw.id"
            :to="`/sites/${siteId}/switches/${sw.id}`"
            class="stagger-item card-glow group relative flex flex-col rounded-lg bg-default"
          >
            <!-- Hover actions -->
            <div class="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-neutral-700/95">
              <UButton icon="i-heroicons-printer" variant="ghost" color="warning" size="xs" @click.prevent="printSingleSwitch(sw.id)" />
              <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click.prevent="onDuplicate(sw)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.prevent="confirmDelete(sw)" />
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
                <UBadge v-if="sw.role" :color="roleColor(sw.role)" variant="subtle" size="sm" class="shrink-0">
                  {{ $t(`switches.roles.${sw.role}`) }}
                </UBadge>
              </div>
              <!-- Tags -->
              <div v-if="sw.tags?.length" class="mt-2 flex flex-wrap gap-1">
                <UBadge v-for="tg in sw.tags" :key="tg" color="neutral" variant="soft" size="sm">
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
            <div class="mt-auto flex items-center justify-between border-t border-default px-5 py-2.5 font-mono">
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
                <span v-if="getPortStats(sw).disabled" class="flex items-center gap-1 text-red-500">
                  <span class="inline-block h-2 w-2 rounded-full bg-red-500" />
                  {{ getPortStats(sw).disabled }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </template>

    <!-- Grid View: Draggable (Single Site) -->
    <ClientOnly v-if="!loading && filteredItems.length > 0 && viewMode === 'grid' && siteId !== 'all'">
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
            :to="`/sites/${siteId}/switches/${sw.id}`"
            class="stagger-item card-glow group relative flex flex-col rounded-lg bg-default"
          >
            <!-- Hover actions -->
            <div class="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-neutral-700/95">
              <UButton icon="i-heroicons-bars-2" class="drag-handle cursor-grab active:cursor-grabbing" variant="ghost" color="neutral" size="xs" @click.prevent />
              <UButton icon="i-heroicons-printer" variant="ghost" color="warning" size="xs" @click.prevent="printSingleSwitch(sw.id)" />
              <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click.prevent="onDuplicate(sw)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.prevent="confirmDelete(sw)" />
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
                <UBadge v-if="sw.role" :color="roleColor(sw.role)" variant="subtle" size="sm" class="shrink-0">
                  {{ $t(`switches.roles.${sw.role}`) }}
                </UBadge>
              </div>
              <!-- Tags -->
              <div v-if="sw.tags?.length" class="mt-2 flex flex-wrap gap-1">
                <UBadge v-for="tg in sw.tags" :key="tg" color="neutral" variant="soft" size="sm">
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
            <div class="mt-auto flex items-center justify-between border-t border-default px-5 py-2.5 font-mono">
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
                <span v-if="getPortStats(sw).disabled" class="flex items-center gap-1 text-red-500">
                  <span class="inline-block h-2 w-2 rounded-full bg-red-500" />
                  {{ getPortStats(sw).disabled }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </template>
      </draggable>
      <template #fallback>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 3" :key="i" class="h-40 animate-pulse rounded-lg border border-default bg-elevated" />
        </div>
      </template>
    </ClientOnly>

    <!-- List View -->
    <div v-if="!loading && filteredItems.length > 0 && viewMode === 'list'">
      <div v-for="group in groupedItems" :key="group.siteId" class="mb-6">
        <div v-if="groupedItems.length > 1" class="mb-3 flex items-center gap-3">
          <UIcon name="i-heroicons-building-office-2" class="h-4 w-4 text-gray-500" />
          <span class="text-sm font-semibold text-gray-400">{{ group.siteName }}</span>
          <div class="h-px flex-1 bg-default" />
        </div>
        <div class="flex flex-col gap-2">
          <NuxtLink
            v-for="sw in group.items"
            :key="sw.id"
            :to="`/sites/${siteId}/switches/${sw.id}`"
            class="stagger-item card-glow group relative flex items-center gap-4 rounded-lg bg-default px-5 py-3"
          >
            <!-- Hover actions -->
            <div class="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-neutral-700/95">
              <UButton icon="i-heroicons-printer" variant="ghost" color="warning" size="xs" @click.prevent="printSingleSwitch(sw.id)" />
              <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click.prevent="onDuplicate(sw)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.prevent="confirmDelete(sw)" />
            </div>

            <!-- Info -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="truncate font-semibold text-gray-900 dark:text-white">{{ sw.name }}</h3>
                <UBadge v-if="sw.role" :color="roleColor(sw.role)" variant="subtle" size="sm">
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
                <UBadge v-for="tg in (sw.tags || [])" :key="tg" color="neutral" variant="soft" size="sm">
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
                <span v-if="getPortStats(sw).disabled" class="flex items-center gap-1 text-red-500">
                  <span class="inline-block h-2 w-2 rounded-full bg-red-500" />
                  {{ getPortStats(sw).disabled }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
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
        <UButton :to="`/sites/${siteId}/switches/create`" icon="i-heroicons-plus">{{ $t('switches.create') }}</UButton>
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

const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const { t } = useI18n()
useHead({ title: t('switches.title') })
const toast = useToast()
const { items, loading: composableLoading, fetch: fetchSwitches, remove, duplicate } = useSwitches()
const pageLoading = ref(true)
const loading = computed(() => composableLoading.value || pageLoading.value)
const { items: allSites, fetch: fetchAllSites } = useSites()
const siteMap = computed(() => {
  const map: Record<string, string> = {}
  for (const s of allSites.value) map[s.id] = s.name
  return map
})

const viewMode = ref<'grid' | 'list'>('grid')
const printSelectedIds = ref<string[]>([])
const printSearch = ref('')

const printFilteredItems = computed(() => {
  const q = printSearch.value.toLowerCase().trim()
  if (!q) return filteredItems.value
  return filteredItems.value.filter((sw: any) => sw.name.toLowerCase().includes(q))
})

const printFilteredGroups = computed(() => {
  const q = printSearch.value.toLowerCase().trim()
  if (!q) return groupedItems.value
  return groupedItems.value
    .map((g: any) => ({ ...g, items: g.items.filter((sw: any) => sw.name.toLowerCase().includes(q)) }))
    .filter((g: any) => g.items.length > 0)
})

function togglePrintId(swId: string) {
  const idx = printSelectedIds.value.indexOf(swId)
  if (idx >= 0) printSelectedIds.value.splice(idx, 1)
  else printSelectedIds.value.push(swId)
}

function printSingleSwitch(swId: string) {
  window.open(`/sites/${siteId.value}/switches/print?ids=${swId}`, '_blank')
}

function openPrintPage() {
  if (printSelectedIds.value.length === 0) return
  const ids = printSelectedIds.value.join(',')
  window.open(`/sites/${siteId.value}/switches/print?ids=${ids}`, '_blank')
}

// Reuse groupedItems for print popover site grouping

const search = ref('')
const locationFilter = ref<string | undefined>(undefined)
const roleFilter = ref<string | undefined>(undefined)
const tagFilter = ref<string | undefined>(undefined)
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const deleting = ref(false)
const availableLocations = ref<string[]>([])
const availableTags = ref<string[]>([])

const sortedItems = ref<any[]>([])
const allItems = computed(() => items.value)

const roleOptions = computed(() => [
  { value: 'core', label: t('switches.roles.core') },
  { value: 'distribution', label: t('switches.roles.distribution') },
  { value: 'access', label: t('switches.roles.access') },
  { value: 'management', label: t('switches.roles.management') }
])

const locationOptions = computed(() =>
  availableLocations.value.map(l => ({ value: l, label: l }))
)

const tagOptions = computed(() =>
  availableTags.value.map(tg => ({ value: tg, label: tg }))
)

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

const groupedItems = computed(() => {
  if (siteId.value !== 'all') return [{ siteId: '', siteName: '', items: filteredItems.value }]
  const groups: { siteId: string; siteName: string; items: any[] }[] = []
  const groupMap = new Map<string, any[]>()
  for (const item of filteredItems.value) {
    const sid = item.site_id || ''
    if (!groupMap.has(sid)) groupMap.set(sid, [])
    groupMap.get(sid)!.push(item)
  }
  for (const [sid, items] of groupMap) {
    groups.push({ siteId: sid, siteName: siteMap.value[sid] || sid, items })
  }
  return groups
})

function roleColor(role: string): any {
  const map: Record<string, string> = {
    core: 'error',
    distribution: 'info',
    access: 'success',
    management: 'warning'
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
    if (result && (result as any).id) await navigateTo(`/sites/${siteId.value}/switches/${(result as any).id}`)
  } catch (e: any) { toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' }) }
}

const { apiFetch } = useApiFetch()
const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

async function loadData() {
  await fetchSwitches(siteParams.value)
  try {
    const response = await apiFetch<any>('/api/switches', { params: { per_page: 1, ...siteParams.value } })
    availableLocations.value = response?.filters?.locations || []
    availableTags.value = response?.filters?.tags || []
  } catch { /* silent */ }
}

onMounted(async () => {
  const fetches: Promise<any>[] = [loadData()]
  if (siteId.value === 'all') fetches.push(fetchAllSites())
  await Promise.all(fetches)
  pageLoading.value = false
})
</script>
