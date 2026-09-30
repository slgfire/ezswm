<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('switches.title') }}</h1>
      <UButton :to="`/sites/${siteId}/switches/create`" icon="i-heroicons-plus" size="sm">
        {{ $t('switches.create') }}
      </UButton>
    </div>

    <!-- Toolbar: two logical zones. The left zone (filters) is flex-1 and wraps
         internally; the right zone (display/organization/actions) keeps its own
         boundary and, when the parent wraps, drops to its own full line pinned
         right by ml-auto — the zones never interleave on the same line. -->
    <div v-if="!loading && allItems.length > 0" class="mb-4 flex flex-wrap items-center gap-3">
      <!-- Left zone: filters -->
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-3">
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
      </div>
      <!-- Right cluster: display (Cards/List), organization (Grouped/Flat,
           Manage Groups) and actions (print/QR). ml-auto is unconditional so
           the cluster always anchors right and wraps under the filters as a
           single unit, in all-sites and single-site mode alike. -->
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <!-- Cards/List segmented control (icon-only; names via tooltip/aria) -->
        <div class="flex items-center rounded-md border border-default p-0.5" role="group" :aria-label="`${$t('switches.viewGrid')} / ${$t('switches.viewList')}`">
          <UTooltip :text="$t('switches.viewGrid')">
            <UButton
              icon="i-heroicons-squares-2x2"
              size="xs"
              :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
              :aria-label="$t('switches.viewGrid')"
              :aria-pressed="viewMode === 'grid'"
              @click="void (viewMode = 'grid')"
            />
          </UTooltip>
          <UTooltip :text="$t('switches.viewList')">
            <UButton
              icon="i-heroicons-bars-3"
              size="xs"
              :variant="viewMode === 'list' ? 'solid' : 'ghost'"
              :aria-label="$t('switches.viewList')"
              :aria-pressed="viewMode === 'list'"
              @click="void (viewMode = 'list')"
            />
          </UTooltip>
        </div>

        <!-- Grouped/Flat segmented control (single-site only, icon-only) -->
        <div v-if="groupsUiEnabled" class="flex items-center rounded-md border border-default p-0.5" role="group" :aria-label="`${$t('switches.groups.groupedView')} / ${$t('switches.groups.flatView')}`">
          <UTooltip :text="$t('switches.groups.groupedView')">
            <UButton
              icon="i-heroicons-rectangle-group"
              size="xs"
              :variant="groupViewMode === 'grouped' ? 'solid' : 'ghost'"
              :aria-label="$t('switches.groups.groupedView')"
              :aria-pressed="groupViewMode === 'grouped'"
              @click="void (groupViewMode = 'grouped')"
            />
          </UTooltip>
          <UTooltip :text="$t('switches.groups.flatView')">
            <UButton
              icon="i-heroicons-bars-3-bottom-left"
              size="xs"
              :variant="groupViewMode === 'flat' ? 'solid' : 'ghost'"
              :aria-label="$t('switches.groups.flatView')"
              :aria-pressed="groupViewMode === 'flat'"
              @click="void (groupViewMode = 'flat')"
            />
          </UTooltip>
        </div>

        <!-- Manage Groups (single-site only), wrapped in the same segmented
             container so height/padding/alignment match exactly. Keeps its
             text label: it is an action, not a toggle. -->
        <div v-if="groupsUiEnabled" class="manage-groups-trigger flex items-center rounded-md border border-default p-0.5">
          <SwitchGroupManager
            :site-id="siteId"
            :groups="orderedGroups"
            :switches="allItems"
            @created="onGroupCreated"
            @updated="onGroupUpdated"
            @deleted="onGroupDeleted"
            @move="moveGroupByButton"
          />
        </div>

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
              :groups="cardGroups"
              @favorite="toggleFavorite"
              @print="printSingleSwitch"
              @duplicate="onDuplicate"
              @delete="confirmDelete"
              @assign-group="assignSwitchToGroup"
            />
          </NuxtLink>
        </div>
      </div>
    </template>

    <!-- Grouped View: Single Site -->
    <ClientOnly v-if="!loading && filteredItems.length > 0 && siteId !== 'all' && effectiveGroupViewMode === 'grouped'">
      <draggable
        v-model="visibleGroups"
        item-key="id"
        handle=".group-drag-handle"
        :animation="180"
        :group="{ name: 'switch-group-headers', pull: false, put: false }"
        class="space-y-4"
        @end="saveGroupSortOrder"
      >
        <template #item="{ element: group }">
          <section class="overflow-hidden rounded-lg border border-default bg-default/40">
            <header class="flex items-center gap-2 border-b border-default px-3 py-2.5">
              <UButton
                icon="i-tabler-grip-vertical"
                size="xs"
                variant="ghost"
                color="neutral"
                class="group-drag-handle cursor-grab active:cursor-grabbing"
                :aria-label="$t('switches.groups.dragGroup')"
                @click.prevent
              />
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                :aria-expanded="isGroupExpanded(group.id)"
                :aria-controls="`switch-group-content-${group.id}`"
                :aria-label="`${group.name}: ${isGroupExpanded(group.id) ? $t('switches.groups.collapse') : $t('switches.groups.expand')}`"
                @click="toggleGroupExpanded(group.id)"
              >
                <UIcon name="i-heroicons-server-stack" class="h-4 w-4 shrink-0 text-primary-400" />
                <span class="truncate text-sm font-semibold">{{ group.name }}</span>
                <UBadge color="neutral" variant="subtle" size="xs">{{ groupSwitchItems[group.id]?.length || 0 }}</UBadge>
                <UIcon
                  :name="isGroupExpanded(group.id) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                  class="ml-auto h-4 w-4 shrink-0 text-muted"
                />
              </button>
            </header>
            <div v-show="isGroupExpanded(group.id)" :id="`switch-group-content-${group.id}`" class="p-3">
              <ClientOnly v-if="viewMode === 'grid'">
                <draggable
                  :list="groupSwitchItems[group.id]"
                  item-key="id"
                  handle=".drag-handle"
                  :animation="200"
                  :group="{ name: `switches-${group.id}`, pull: false, put: false }"
                  class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  @end="saveGroupedSwitchOrder()"
                >
                  <template #item="{ element: sw }">
                    <NuxtLink :to="`/sites/${siteId}/switches/${sw.slug || sw.id}`" class="h-full">
                      <SwitchCard
                        :sw="sw"
                        :site-id="siteId"
                        variant="grid"
                        :draggable="true"
                        :uniform="true"
                        :groups="cardGroups"
                        @favorite="toggleFavorite"
                        @print="printSingleSwitch"
                        @duplicate="onDuplicate"
                        @delete="confirmDelete"
                        @assign-group="assignSwitchToGroup"
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
              <div v-if="viewMode === 'list'" class="flex flex-col gap-2">
                <NuxtLink v-for="sw in groupSwitchItems[group.id]" :key="sw.id" :to="`/sites/${siteId}/switches/${sw.slug || sw.id}`">
                  <SwitchCard
                    :sw="sw"
                    :site-id="siteId"
                    variant="list"
                    :groups="cardGroups"
                    @favorite="toggleFavorite"
                    @print="printSingleSwitch"
                    @duplicate="onDuplicate"
                    @delete="confirmDelete"
                    @assign-group="assignSwitchToGroup"
                  />
                </NuxtLink>
              </div>
            </div>
          </section>
        </template>
      </draggable>

      <!-- Ungrouped switches intentionally stay after every named group. The
           explicit top margin matches the toolbar-to-content rhythm (mb-4 /
           16px): the section is a sibling of the draggable container, so
           space-y never applies to it. -->
      <section v-if="ungroupedSwitches.length" class="mt-4 overflow-hidden rounded-lg border border-default bg-default/40">
        <header class="flex items-center gap-2 border-b border-default px-3 py-2.5">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :aria-expanded="isGroupExpanded('_ungrouped')"
            aria-controls="switch-group-content-ungrouped"
            :aria-label="`${$t('switches.groups.ungrouped')}: ${isGroupExpanded('_ungrouped') ? $t('switches.groups.collapse') : $t('switches.groups.expand')}`"
            @click="toggleGroupExpanded('_ungrouped')"
          >
            <UIcon name="i-heroicons-server-stack" class="h-4 w-4 shrink-0 text-muted" />
            <span class="text-sm font-semibold">{{ $t('switches.groups.ungrouped') }}</span>
            <UBadge color="neutral" variant="subtle" size="xs">{{ ungroupedSwitches.length }}</UBadge>
            <UIcon
              :name="isGroupExpanded('_ungrouped') ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="ml-auto h-4 w-4 shrink-0 text-muted"
            />
          </button>
        </header>
        <div v-show="isGroupExpanded('_ungrouped')" id="switch-group-content-ungrouped" class="p-3">
          <ClientOnly v-if="viewMode === 'grid'">
            <draggable
              :list="ungroupedSwitches"
              item-key="id"
              handle=".drag-handle"
              :animation="200"
              :group="{ name: 'switches-ungrouped', pull: false, put: false }"
              class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              @end="saveGroupedSwitchOrder()"
            >
              <template #item="{ element: sw }">
                <NuxtLink :to="`/sites/${siteId}/switches/${sw.slug || sw.id}`" class="h-full">
                  <SwitchCard
                    :sw="sw"
                    :site-id="siteId"
                    variant="grid"
                    :draggable="true"
                    :uniform="true"
                    :groups="cardGroups"
                    @favorite="toggleFavorite"
                    @print="printSingleSwitch"
                    @duplicate="onDuplicate"
                    @delete="confirmDelete"
                    @assign-group="assignSwitchToGroup"
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
          <div v-if="viewMode === 'list'" class="flex flex-col gap-2">
            <NuxtLink v-for="sw in ungroupedSwitches" :key="sw.id" :to="`/sites/${siteId}/switches/${sw.slug || sw.id}`">
              <SwitchCard
                :sw="sw"
                :site-id="siteId"
                variant="list"
                :groups="cardGroups"
                @favorite="toggleFavorite"
                @print="printSingleSwitch"
                @duplicate="onDuplicate"
                @delete="confirmDelete"
                @assign-group="assignSwitchToGroup"
              />
            </NuxtLink>
          </div>
        </div>
      </section>
      <template #fallback>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 3" :key="i" class="h-40 animate-pulse rounded-lg border border-default bg-elevated" />
        </div>
      </template>
    </ClientOnly>

    <!-- Grid View: Draggable (Single Site) -->
    <ClientOnly v-if="!loading && filteredItems.length > 0 && viewMode === 'grid' && siteId !== 'all' && effectiveGroupViewMode === 'flat'">
      <draggable
        v-model="sortedItems"
        item-key="id"
        handle=".drag-handle"
        :animation="200"
        :move="canMoveFlatSwitch"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        @end="saveFlatSortOrder"
      >
        <template #item="{ element: sw }">
          <NuxtLink :to="`/sites/${siteId}/switches/${sw.slug || sw.id}`">
            <SwitchCard
              :sw="sw"
              :site-id="siteId"
              variant="grid"
              :draggable="true"
              :groups="cardGroups"
              @favorite="toggleFavorite"
              @print="printSingleSwitch"
              @duplicate="onDuplicate"
              @delete="confirmDelete"
              @assign-group="assignSwitchToGroup"
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

    <!-- List View (all-sites or single-site flat; grouped list renders inside group sections above) -->
    <div v-if="!loading && filteredItems.length > 0 && viewMode === 'list' && (siteId === 'all' || effectiveGroupViewMode === 'flat')">
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
              :groups="cardGroups"
              @favorite="toggleFavorite"
              @print="printSingleSwitch"
              @duplicate="onDuplicate"
              @delete="confirmDelete"
              @assign-group="assignSwitchToGroup"
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
import type { SwitchGroup } from '~~/types/switchGroup'
import draggable from 'vuedraggable'
import { FILTER_ALL } from '~~/app/composables/useSwitchListFilters'

const UNGROUPED_ID = '_ungrouped'

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

// --- Switch groups (single-site only) ---

// Global feature toggle (Settings > General). Default ON; when disabled the
// switch-groups API is gated (404), so we skip fetching groups entirely and
// hide all group UI. Groups and assignments stay intact server-side.
const { settings: appSettings, fetch: fetchAppSettings } = useSettings()
const switchGroupsEnabled = computed(() => appSettings.value?.switch_groups_enabled ?? true)
const groupsUiEnabled = computed(() => switchGroupsEnabled.value && siteId.value !== 'all')

const groups = ref<SwitchGroup[]>([])
const orderedGroups = computed(() =>
  [...groups.value].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
)
// undefined hides the SwitchCard assignment menu; with the feature disabled
// every card must behave like the all-sites overview.
const cardGroups = computed(() => groupsUiEnabled.value ? orderedGroups.value : undefined)

// Groups that currently have at least one visible (filtered) switch, in
// persisted group order. Drives the draggable group-header list. The setter
// merges the reordered visible groups back into the full ordered list by
// position, so groups hidden by filters keep their relative slots.
const visibleGroups = computed({
  get: () => orderedGroups.value.filter(g => (groupSwitchItems.value[g.id]?.length ?? 0) > 0),
  set: (reorderedVisible: SwitchGroup[]) => {
    const hidden = orderedGroups.value.filter(g => !reorderedVisible.some(v => v.id === g.id))
    const remaining = [...reorderedVisible]
    groups.value = orderedGroups.value.map((g) => {
      if (hidden.some(h => h.id === g.id)) return g
      return remaining.shift() ?? g
    })
  }
})

// Filter first, then present grouped: each bucket keeps the filtered list's
// favorites-first order.
const groupSwitchItems = computed<Record<string, Switch[]>>(() => {
  const buckets: Record<string, Switch[]> = {}
  for (const sw of filteredItems.value) {
    const gid = sw.group_id && groups.value.some(g => g.id === sw.group_id) ? sw.group_id : UNGROUPED_ID
    if (!buckets[gid]) buckets[gid] = []
    buckets[gid].push(sw)
  }
  return buckets
})

const ungroupedSwitches = computed(() => groupSwitchItems.value[UNGROUPED_ID] ?? [])

// localStorage: per-site view mode + per-site per-group expansion state.
// loadState() guards on `process.client` so SSR never touches localStorage.
interface GroupUiState { viewMode: 'grouped' | 'flat', expanded: string[] }

function loadGroupUiState(sid: string): GroupUiState {
  const fallback: GroupUiState = { viewMode: 'grouped', expanded: [] }
  if (!import.meta.client) return fallback
  try {
    const raw = localStorage.getItem(`ezswm-switch-groups:${sid}`)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<GroupUiState>
    return {
      viewMode: parsed.viewMode === 'flat' ? 'flat' : 'grouped',
      expanded: Array.isArray(parsed.expanded) ? parsed.expanded.filter(v => typeof v === 'string') : []
    }
  } catch {
    return fallback
  }
}

function saveGroupUiState(sid: string, state: GroupUiState) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(`ezswm-switch-groups:${sid}`, JSON.stringify(state))
  } catch { /* storage unavailable — non-fatal */ }
}

// Null = "default" (all groups expanded) until the user first collapses one;
// this keeps a default-expanded view without persisting every group id.
const groupViewMode = ref<'grouped' | 'flat'>('grouped')
const expandedGroups = ref<string[] | null>(null)

// Render mode actually shown: with the feature disabled we present the flat
// view WITHOUT overwriting the persisted localStorage preference, so the
// user's grouped/flat choice survives a temporary disable.
const effectiveGroupViewMode = computed<'grouped' | 'flat'>(() =>
  groupsUiEnabled.value ? groupViewMode.value : 'flat'
)

if (siteId.value !== 'all') {
  const state = loadGroupUiState(siteId.value)
  groupViewMode.value = state.viewMode
  expandedGroups.value = state.expanded.length > 0 ? state.expanded : null
}

function persistGroupUiState() {
  if (siteId.value === 'all') return
  saveGroupUiState(siteId.value, { viewMode: groupViewMode.value, expanded: expandedGroups.value ?? [] })
}

watch(groupViewMode, persistGroupUiState)

function isGroupExpanded(gid: string): boolean {
  if (expandedGroups.value === null) return true
  return expandedGroups.value.includes(gid)
}

function toggleGroupExpanded(gid: string) {
  const allIds = [...orderedGroups.value.map(g => g.id), UNGROUPED_ID]
  if (expandedGroups.value === null) {
    expandedGroups.value = allIds.filter(id => id !== gid)
  } else if (expandedGroups.value.includes(gid)) {
    expandedGroups.value = expandedGroups.value.filter(id => id !== gid)
  } else {
    expandedGroups.value = [...expandedGroups.value, gid]
  }
  persistGroupUiState()
}

async function fetchGroups() {
  if (siteId.value === 'all' || !switchGroupsEnabled.value) return
  try {
    const response = await $fetch<{ data: SwitchGroup[] }>('/api/switch-groups', {
      query: { site_id: siteId.value }
    })
    groups.value = response.data || []
  } catch { /* keep existing groups */ }
}

// In-place group mutations from SwitchGroupManager: patch the local reactive
// list directly so the manager list and every SwitchCard assignment menu
// update immediately — no page navigation, no refetch, no closing the modal.
function onGroupCreated(group: SwitchGroup) {
  if (!groups.value.some(g => g.id === group.id)) groups.value.push(group)
}

function onGroupUpdated(group: SwitchGroup) {
  const existing = groups.value.find(g => g.id === group.id)
  if (existing) Object.assign(existing, group)
  else groups.value.push(group)
}

function onGroupDeleted(groupId: string) {
  groups.value = groups.value.filter(g => g.id !== groupId)
  // Orphaned members must not stay bucketed under the deleted id; the buckets
  // fall back to ungrouped once the group vanishes from `groups`, but clearing
  // group_id keeps the next sort-order submission consistent.
  for (const sw of allItems.value) {
    if (sw.group_id === groupId) sw.group_id = undefined
  }
}

// Keyboard-accessible group reordering (SwitchGroupManager emits index/direction).
async function moveGroupByButton(index: number, direction: -1 | 1) {
  const ordered = [...orderedGroups.value]
  const target = index + direction
  if (target < 0 || target >= ordered.length) return
  const [moved] = ordered.splice(index, 1)
  if (!moved) return
  ordered.splice(target, 0, moved)
  await submitGroupSortOrder(ordered.map(g => g.id))
}

async function saveGroupSortOrder() {
  await submitGroupSortOrder(orderedGroups.value.map(g => g.id))
}

async function submitGroupSortOrder(order: string[]) {
  try {
    await $fetch('/api/switch-groups/sort', { method: 'PUT', body: { order } })
    groups.value = groups.value.map(g => ({ ...g, sort_order: order.indexOf(g.id) }))
  } catch { /* silent — order stays local until next fetch */ }
}

// sort_order is one flat sequence per site: after an in-group move, submit the
// full current site's switch ids in sequence: groups (in group order) ->
// members (in-group order) -> ungrouped last.
// The dragged group's bucket is already mutated by vuedraggable; rebuilding
// the full flat sequence from all buckets is what gets persisted.
async function saveGroupedSwitchOrder() {
  // Submit the COMPLETE single-site order, built from unfiltered allItems:
  // filtered-out switches must stay in the sequence (in their existing
  // relative order), otherwise a drag while a filter is active would drop
  // them from the persisted sort_order sequence.
  const visibleBuckets = groupSwitchItems.value
  const fullBuckets: Record<string, Switch[]> = {}
  for (const sw of allItems.value) {
    const gid = sw.group_id && groups.value.some(g => g.id === sw.group_id) ? sw.group_id : UNGROUPED_ID
    if (!fullBuckets[gid]) fullBuckets[gid] = []
    fullBuckets[gid].push(sw)
  }
  const order: string[] = []
  for (const group of orderedGroups.value) {
    // Visible (dragged) order wins for items present in the filtered bucket;
    // filtered-out members of this group follow in their prior relative order.
    const visibleIds = new Set((visibleBuckets[group.id] ?? []).map(sw => sw.id))
    for (const sw of visibleBuckets[group.id] ?? []) order.push(sw.id)
    for (const sw of fullBuckets[group.id] ?? []) {
      if (!visibleIds.has(sw.id)) order.push(sw.id)
    }
  }
  const visibleUngroupedIds = new Set((visibleBuckets[UNGROUPED_ID] ?? []).map(sw => sw.id))
  for (const sw of visibleBuckets[UNGROUPED_ID] ?? []) order.push(sw.id)
  for (const sw of fullBuckets[UNGROUPED_ID] ?? []) {
    if (!visibleUngroupedIds.has(sw.id)) order.push(sw.id)
  }
  try {
    await $fetch('/api/switches/sort', { method: 'PUT', body: { order } })
  } catch { /* silent */ }
}

// In all-sites view the flat list must not be reorderable (sort_order is
// per-site); in single-site flat view dragging stays as before.
function canMoveFlatSwitch() {
  return siteId.value !== 'all'
}

async function saveFlatSortOrder() {
  if (siteId.value === 'all') return
  await saveSortOrder()
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

// Overview-only group assignment (SwitchCard dropdown). Sends only the
// membership delta plus the OCC token, so it never disturbs other fields.
async function assignSwitchToGroup(sw: Switch, groupId: string | null) {
  const target = groupId ?? null
  if ((sw.group_id ?? null) === target) return
  try {
    await $fetch(`/api/switches/${sw.id}`, {
      method: 'PUT',
      body: { group_id: target, expected_updated_at: sw.updated_at }
    })
    toast.add({ title: t('switches.groups.assigned'), color: 'success' })
    await loadData()
  } catch (e: unknown) {
    const err = e as { statusCode?: number; data?: { message?: string } }
    if (err.statusCode === 409) {
      toast.add({ title: t('switches.groups.assignConflict'), color: 'warning' })
    } else {
      toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
    }
    // Refresh either way: conflict -> show current state; error -> resync.
    await loadData()
  }
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
  const fetches: Promise<void>[] = [loadData(), fetchAppSettings()]
  if (siteId.value === 'all') fetches.push(fetchAllSites())
  await Promise.all(fetches)
  // fetchGroups runs only after settings resolve so the feature gate never
  // hits the 404-guarded switch-groups API while disabled.
  await fetchGroups()
  pageLoading.value = false
})
</script>

<style scoped>
/* The Manage Groups button lives inside SwitchGroupManager (untouchable) as an
   outline `xs` button with its own ring + border. Strip that chrome so, inside
   the shared segmented container above, it renders with the exact same height,
   padding, typography and alignment as the ghost buttons in the Cards/List and
   Grouped/Flat controls. */
.manage-groups-trigger :deep(button) {
  box-shadow: none;
  border: 0;
  background-color: transparent;
}
.manage-groups-trigger :deep(button:hover) {
  background-color: transparent;
}
</style>
