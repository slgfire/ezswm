<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('switches.title') }}</h1>
      <UButton to="/switches/create" icon="i-heroicons-plus" size="sm">
        {{ $t('switches.create') }}
      </UButton>
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        :placeholder="$t('common.search')"
        icon="i-heroicons-magnifying-glass"
        size="sm"
        class="w-64"
      />
      <UInput
        v-model="locationFilter"
        :placeholder="$t('switches.fields.location')"
        icon="i-heroicons-map-pin"
        size="sm"
        class="w-48"
      />
    </div>

    <!-- Sortable Card Grid -->
    <ClientOnly>
      <draggable
        v-if="sortedItems.length > 0"
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
            class="group relative flex flex-col rounded-lg border border-gray-200 bg-white transition-all hover:border-primary-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-primary-500"
          >
            <!-- Hover actions (top-right overlay) -->
            <div class="absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-white/95 px-1.5 py-1 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-gray-700/95">
              <UButton icon="i-heroicons-bars-2" class="drag-handle cursor-grab active:cursor-grabbing" variant="ghost" color="gray" size="2xs" @click.prevent />
              <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="gray" size="2xs" @click.prevent="onDuplicate(sw)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="2xs" @click.prevent="confirmDelete(sw)" />
            </div>

            <!-- Name -->
            <div class="px-5 pt-4 pb-3">
              <h3 class="truncate text-lg font-bold text-gray-900 group-hover:text-primary-500 dark:text-white" :title="sw.name">
                {{ sw.name }}
              </h3>
            </div>

            <!-- Info rows (fixed min-height for equal card sizes) -->
            <div class="min-h-[4.5rem] flex-1 space-y-2 px-5 pb-3 text-sm">
              <div v-if="sw.model" class="flex items-center gap-2.5">
                <UIcon name="i-heroicons-cpu-chip" class="h-4 w-4 flex-shrink-0 text-blue-400" />
                <span class="text-gray-600 dark:text-gray-300">{{ sw.manufacturer ? `${sw.manufacturer} ${sw.model}` : sw.model }}</span>
              </div>
              <div v-if="sw.location" class="flex items-center gap-2.5">
                <UIcon name="i-heroicons-map-pin" class="h-4 w-4 flex-shrink-0 text-amber-400" />
                <span class="text-gray-600 dark:text-gray-300">{{ sw.location }}</span>
              </div>
              <div v-if="sw.management_ip" class="flex items-center gap-2.5">
                <UIcon name="i-heroicons-globe-alt" class="h-4 w-4 flex-shrink-0 text-teal-400" />
                <span class="font-mono text-gray-600 dark:text-gray-300">{{ sw.management_ip }}</span>
              </div>
            </div>

            <!-- Ports footer -->
            <div class="mt-auto flex items-center justify-between border-t border-gray-100 px-5 py-2.5 dark:border-gray-700">
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

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <!-- Empty state -->
    <SharedEmptyState
      v-if="!loading && sortedItems.length === 0 && !search && !locationFilter"
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

const search = ref('')
const locationFilter = ref('')
const page = ref(1)
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const deleting = ref(false)

const sortedItems = ref<any[]>([])

// Items kommen schon sortiert von der API (sort_order)
watch(items, (newItems) => {
  sortedItems.value = applyFilters([...newItems])
}, { immediate: true })

watch([search, locationFilter], () => {
  sortedItems.value = applyFilters([...items.value])
})

function applyFilters(list: any[]): any[] {
  let result = list
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((item: any) =>
      item.name?.toLowerCase().includes(q) || item.model?.toLowerCase().includes(q) ||
      item.management_ip?.toLowerCase().includes(q) || item.serial_number?.toLowerCase().includes(q)
    )
  }
  if (locationFilter.value) {
    const loc = locationFilter.value.toLowerCase()
    result = result.filter((item: any) => item.location?.toLowerCase().includes(loc))
  }
  return result
}

async function saveSortOrder() {
  const order = sortedItems.value.map((s: any) => s.id)
  try {
    await $fetch('/api/switches/sort', { method: 'PUT', body: { order } })
  } catch { /* silent */ }
}

const deleteMessage = computed(() => deleteTarget.value ? `${t('switches.delete')}: ${deleteTarget.value.name}?` : '')

function getPortStats(sw: any) {
  const ports = sw.ports || []
  return {
    up: ports.filter((p: any) => p.status === 'up').length,
    down: ports.filter((p: any) => p.status === 'down').length,
    disabled: ports.filter((p: any) => p.status === 'disabled').length
  }
}

function confirmDelete(row: any) { deleteTarget.value = row; showDeleteDialog.value = true }

async function onDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await remove(deleteTarget.value.id)
    toast.add({ title: t('switches.messages.deleted'), color: 'green' })
    showDeleteDialog.value = false
    await fetchSwitches()
  } catch (e: any) { toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'red' }) }
  finally { deleting.value = false }
}

async function onDuplicate(row: any) {
  try {
    const result = await duplicate(row.id)
    toast.add({ title: t('switches.messages.duplicated'), color: 'green' })
    await fetchSwitches()
    if (result && (result as any).id) await navigateTo(`/switches/${(result as any).id}`)
  } catch (e: any) { toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'red' }) }
}

onMounted(() => { fetchSwitches() })
</script>
