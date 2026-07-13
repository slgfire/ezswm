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
      <USelect
        v-if="locationOptions.length > 1"
        v-model="locationFilter"
        :items="locationOptions"
        value-key="value"
        icon="i-heroicons-map-pin"
        size="sm"
        class="w-48"
      />
      <USelect
        v-model="roleFilter"
        :items="roleOptions"
        value-key="value"
        icon="i-heroicons-rectangle-stack"
        size="sm"
        class="w-44"
      />
      <USelect
        v-if="tagOptions.length > 1"
        v-model="tagFilter"
        :items="tagOptions"
        value-key="value"
        icon="i-heroicons-tag"
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
                  <UButton size="xs" variant="ghost" @click="print.selectedIds.length === filteredItems.length ? print.deselectAll() : print.selectAll(filteredItems.map((s) => s.id))">
                    {{ print.selectedIds.length === filteredItems.length ? $t('common.deselectAll') : $t('common.selectAll') }}
                  </UButton>
                </div>
              </div>
              <UInput v-model="print.search" :placeholder="$t('common.search') + '...'" size="xs" class="mb-2 w-full" icon="i-heroicons-magnifying-glass" />
              <div class="max-h-60 overflow-y-auto space-y-0.5">
                <template v-if="siteId === 'all'">
                  <template v-for="group in print.filteredGroups" :key="group.siteId">
                    <div v-if="group.siteName" class="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{{ group.siteName }}</div>
                    <label
                      v-for="sw in group.items"
                      :key="sw.id"
                      class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <input
                        type="checkbox"
                        :checked="print.selectedIds.includes(sw.id)"
                        class="h-3.5 w-3.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        @change="print.toggle(sw.id)"
                      >
                      <span class="truncate text-xs">{{ sw.name }}</span>
                    </label>
                  </template>
                </template>
                <template v-else>
                  <label
                    v-for="sw in print.filteredList"
                    :key="sw.id"
                    class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <input
                      type="checkbox"
                      :checked="print.selectedIds.includes(sw.id)"
                      class="h-3.5 w-3.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      @change="print.toggle(sw.id)"
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
                  :disabled="print.selectedIds.length === 0"
                  @click="openPrintPage"
                >
                  {{ $t('print.printSelected', { n: print.selectedIds.length }) }}
                </UButton>
              </div>
            </div>
          </template>
        </UPopover>

        <!-- QR Sticker popover with switch checkboxes -->
        <UPopover>
          <UButton icon="i-heroicons-qr-code" variant="ghost" color="neutral" size="xs" />
          <template #content>
            <div class="w-72 p-3">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ $t('public.admin.title') }}</span>
                <div class="flex gap-1">
                  <UButton size="xs" variant="ghost" @click="qr.selectedIds.length === filteredItems.length ? qr.deselectAll() : qr.selectAll(filteredItems.map((s) => s.id))">
                    {{ qr.selectedIds.length === filteredItems.length ? $t('common.deselectAll') : $t('common.selectAll') }}
                  </UButton>
                </div>
              </div>
              <UInput v-model="qr.search" :placeholder="$t('common.search') + '...'" size="xs" class="mb-2 w-full" icon="i-heroicons-magnifying-glass" />
              <div class="max-h-60 overflow-y-auto space-y-0.5">
                <template v-if="siteId === 'all'">
                  <template v-for="group in qr.filteredGroups" :key="group.siteId">
                    <div v-if="group.siteName" class="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{{ group.siteName }}</div>
                    <label
                      v-for="sw in group.items"
                      :key="sw.id"
                      class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <input
                        type="checkbox"
                        :checked="qr.selectedIds.includes(sw.id)"
                        class="h-3.5 w-3.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        @change="qr.toggle(sw.id)"
                      >
                      <span class="truncate text-xs">{{ sw.name }}</span>
                    </label>
                  </template>
                </template>
                <template v-else>
                  <label
                    v-for="sw in qr.filteredList"
                    :key="sw.id"
                    class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <input
                      type="checkbox"
                      :checked="qr.selectedIds.includes(sw.id)"
                      class="h-3.5 w-3.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      @change="qr.toggle(sw.id)"
                    >
                    <span class="truncate text-xs">{{ sw.name }}</span>
                  </label>
                </template>
              </div>
              <div class="mt-2 border-t border-default pt-2">
                <UButton
                  icon="i-heroicons-qr-code"
                  size="xs"
                  block
                  :disabled="qr.selectedIds.length === 0"
                  @click="openQrPrintPage"
                >
                  {{ $t('public.admin.printSticker') }} ({{ qr.selectedIds.length }})
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
            @click="void (viewMode = 'grid')"
          />
        </UTooltip>
        <UTooltip :text="$t('switches.viewList')">
          <UButton
            icon="i-heroicons-bars-3"
            size="xs"
            :variant="viewMode === 'list' ? 'solid' : 'ghost'"
            @click="void (viewMode = 'list')"
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
          <NuxtLink v-for="sw in group.items" :key="sw.id" :to="`/sites/${siteId}/switches/${sw.slug || sw.id}`">
            <SwitchCard
              :sw="sw"
              :site-id="siteId"
              variant="grid"
              @favorite="toggleFavorite"
              @print="printSingleSwitch"
              @duplicate="onDuplicate"
              @delete="confirmDelete"
            />
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
          <NuxtLink :to="`/sites/${siteId}/switches/${sw.slug || sw.id}`">
            <SwitchCard
              :sw="sw"
              :site-id="siteId"
              variant="grid"
              :draggable="true"
              @favorite="toggleFavorite"
              @print="printSingleSwitch"
              @duplicate="onDuplicate"
              @delete="confirmDelete"
            />
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
          <NuxtLink v-for="sw in group.items" :key="sw.id" :to="`/sites/${siteId}/switches/${sw.slug || sw.id}`">
            <SwitchCard
              :sw="sw"
              :site-id="siteId"
              variant="list"
              @favorite="toggleFavorite"
              @print="printSingleSwitch"
              @duplicate="onDuplicate"
              @delete="confirmDelete"
            />
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
import type { Switch } from '~~/types/switch'
import draggable from 'vuedraggable'
import { FILTER_ALL } from '~~/app/composables/useSwitchListFilters'

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
const showDeleteDialog = ref(false)
const deleteTarget = ref<Switch | null>(null)
const deleting = ref(false)

const sortedItems = ref<Switch[]>([])
const allItems = computed(() => items.value)

const roleOptions = computed(() => [
  { value: FILTER_ALL, label: t('switches.allRoles') },
  { value: 'core', label: t('switches.roles.core') },
  { value: 'distribution', label: t('switches.roles.distribution') },
  { value: 'access', label: t('switches.roles.access') },
  { value: 'management', label: t('switches.roles.management') }
])

const locationOptions = computed(() => {
  const locs = [...new Set(allItems.value.map(s => s.location).filter((l): l is string => !!l))].sort()
  return [
    { value: FILTER_ALL, label: t('switches.allLocations') },
    ...locs.map(l => ({ value: l, label: l }))
  ]
})

const tagOptions = computed(() => {
  const tags = [...new Set(allItems.value.flatMap(s => s.tags || []))].sort()
  return [
    { value: FILTER_ALL, label: t('switches.allTags') },
    ...tags.map(tg => ({ value: tg, label: tg }))
  ]
})

const { search, locationFilter, roleFilter, tagFilter, filteredItems, groupedItems } = useSwitchListFilters(allItems, siteId, siteMap)

const print = useSelectionPopover(filteredItems, groupedItems)
const qr = useSelectionPopover(filteredItems, groupedItems)

watch(items, (newItems) => {
  sortedItems.value = [...newItems]
}, { immediate: true })

watch(filteredItems, (fi) => {
  sortedItems.value = fi
})

async function saveSortOrder() {
  const order = sortedItems.value.map((s) => s.id)
  try {
    await $fetch('/api/switches/sort', { method: 'PUT', body: { order } })
  } catch { /* silent */ }
}

const deleteMessage = computed(() => deleteTarget.value ? `${t('switches.delete')}: ${deleteTarget.value.name}?` : '')

function confirmDelete(row: Switch) { deleteTarget.value = row; showDeleteDialog.value = true }

async function toggleFavorite(sw: Switch) {
  try {
    // Use the PK, not the slug: per-site slugs are not globally unique, so
    // PUT /api/switches/<slug> can't resolve without a siteId and 404s. The
    // UUID resolves directly. (List can be cross-site via siteId="all".)
    await $fetch(`/api/switches/${sw.id}`, {
      method: 'PUT',
      body: { is_favorite: !sw.is_favorite }
    })
    sw.is_favorite = !sw.is_favorite
  } catch {
    // Silent fail
  }
}

async function onDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await remove(deleteTarget.value.id)
    toast.add({ title: t('switches.messages.deleted'), color: 'success' })
    showDeleteDialog.value = false
    await loadData()
  } catch (e: unknown) { const err = e as { data?: { message?: string } }; toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deleting.value = false }
}

async function onDuplicate(row: Switch) {
  try {
    const result = await duplicate(row.id)
    toast.add({ title: t('switches.messages.duplicated'), color: 'success' })
    await loadData()
    if (result?.id) await navigateTo(`/sites/${siteId.value}/switches/${result.slug || result.id}`)
  } catch (e: unknown) { const err = e as { data?: { message?: string } }; toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' }) }
}

function printSingleSwitch(swId: string) {
  window.open(`/sites/${siteId.value}/switches/print?ids=${swId}`, '_blank')
}

function openPrintPage() {
  if (print.selectedIds.length === 0) return
  const ids = print.selectedIds.join(',')
  window.open(`/sites/${siteId.value}/switches/print?ids=${ids}`, '_blank')
}

function openQrPrintPage() {
  if (qr.selectedIds.length === 0) return
  const ids = qr.selectedIds.join(',')
  window.open(`/sites/${siteId.value}/switches/qr-print?ids=${ids}`, '_blank')
}

const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

async function loadData() {
  await fetchSwitches(siteParams.value)
}

onMounted(async () => {
  const fetches: Promise<void>[] = [loadData()]
  if (siteId.value === 'all') fetches.push(fetchAllSites())
  await Promise.all(fetches)
  pageLoading.value = false
})
</script>
