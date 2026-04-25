<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('networks.title') }}</h1>
      <UButton :to="`/sites/${siteId}/networks/create`" icon="i-heroicons-plus" size="sm">
        {{ $t('networks.create') }}
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="pageLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <template v-else>
    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass"
        :placeholder="$t('common.search')"
        size="sm"
        class="w-64"
      />
      <USelect
        v-model="vlanFilter"
        :items="vlanFilterOptions"
        :placeholder="$t('networks.fields.vlan')"
        size="sm"
        class="w-48"
      />
    </div>

    <!-- Network List -->
    <div v-if="sortedItems.length > 0">
      <div v-for="group in groupedItems" :key="group.siteId" class="mb-4">
        <div v-if="groupedItems.length > 1" class="mb-2 flex items-center gap-3">
          <UIcon name="i-heroicons-building-office-2" class="h-4 w-4 text-gray-500" />
          <span class="text-sm font-semibold text-gray-400">{{ group.siteName }}</span>
          <div class="h-px flex-1 bg-default" />
        </div>
        <div class="list-container rounded-lg bg-default">
          <!-- Sort header -->
          <div class="flex items-center gap-4 border-b border-default px-5 py-1.5 text-[10px] uppercase tracking-wider text-gray-500">
            <button class="flex items-center gap-1 transition-colors hover:text-gray-600 dark:hover:text-gray-200" @click="toggleSort('name')">
              {{ $t('common.name') }}
              <UIcon v-if="sortField === 'name'" :name="sortAsc ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
            </button>
            <button class="flex items-center gap-1 transition-colors hover:text-gray-600 dark:hover:text-gray-200" @click="toggleSort('subnet')">
              {{ $t('networks.infoBar.subnet') }}
              <UIcon v-if="sortField === 'subnet'" :name="sortAsc ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
            </button>
            <button class="flex items-center gap-1 transition-colors hover:text-gray-600 dark:hover:text-gray-200" @click="toggleSort('gateway')">
              {{ $t('networks.infoBar.gateway') }}
              <UIcon v-if="sortField === 'gateway'" :name="sortAsc ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
            </button>
          </div>
          <!-- Rows -->
          <NuxtLink
            v-for="(net, i) in group.items"
            :key="net.id"
            :to="`/sites/${siteId}/networks/${net.id}`"
            class="row-hover group flex items-stretch pr-5"
            :class="i > 0 ? 'border-t border-default' : ''"
          >
            <!-- VLAN color left accent -->
            <div
              class="w-1 flex-shrink-0"
              :style="getVlan(net.vlan_id) ? { backgroundColor: getVlan(net.vlan_id)?.color } : {}"
              :class="[
                !getVlan(net.vlan_id) ? 'bg-transparent' : '',
                i === 0 ? 'rounded-tl-lg' : '',
                i === group.items.length - 1 ? 'rounded-bl-lg' : ''
              ]"
            />

            <!-- Main info -->
            <div class="min-w-0 flex-1 py-3 pl-4">
              <div class="flex items-center gap-2">
                <span class="text-base font-semibold text-gray-900 dark:text-white">{{ net.name }}</span>
                <code class="rounded bg-primary-50 px-2 py-0.5 text-sm font-medium text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">{{ net.subnet }}</code>
              </div>
              <div class="mt-0.5 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span v-if="net.gateway" class="flex items-center gap-1 font-mono">
                  <UIcon name="i-heroicons-arrow-right-circle" class="h-3 w-3 text-gray-400" />
                  {{ net.gateway }}
                </span>
                <span v-if="getVlan(net.vlan_id)" class="flex items-center gap-1">
                  <UIcon name="i-heroicons-tag" class="h-3 w-3 text-gray-400" />
                  VLAN {{ getVlan(net.vlan_id)?.vlan_id }} · {{ getVlan(net.vlan_id)?.name }}
                </span>
                <span v-if="net.description" class="flex items-center gap-1 truncate">
                  <UIcon name="i-heroicons-document-text" class="h-3 w-3 flex-shrink-0 text-gray-400" />
                  {{ net.description }}
                </span>
              </div>
            </div>

            <!-- Actions (on hover) -->
            <div class="flex items-center gap-1 py-3 opacity-0 transition-opacity group-hover:opacity-100">
              <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.prevent="openDeleteDialog(net)" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <SharedEmptyState
      v-else-if="!loading"
      icon="i-heroicons-globe-alt"
      :title="$t('networks.emptyTitle')"
      :description="$t('networks.emptyDescription')"
    >
      <template #action>
        <UButton :to="`/sites/${siteId}/networks/create`" icon="i-heroicons-plus">{{ $t('networks.create') }}</UButton>
      </template>
    </SharedEmptyState>
    </template>

    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('networks.delete')"
      :message="deleteMessage"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { Network } from '~~/types/network'

const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const { t } = useI18n()
useHead({ title: t('networks.title') })
const toast = useToast()
const { items, loading, fetch: fetchNetworks, remove } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()
const { items: allSites, fetch: fetchAllSites } = useSites()
const siteMap = computed(() => {
  const map: Record<string, string> = {}
  for (const s of allSites.value) map[s.id] = s.name
  return map
})

const pageLoading = ref(true)
const search = ref('')
const vlanFilter = ref('all')
const showDeleteDialog = ref(false)
const deleteTarget = ref<Network | null>(null)
const deleteMessage = ref('')
const deleting = ref(false)

const sortField = ref<'name' | 'subnet' | 'gateway'>('name')
const sortAsc = ref(true)

function toggleSort(field: 'name' | 'subnet' | 'gateway') {
  if (sortField.value === field) sortAsc.value = !sortAsc.value
  else { sortField.value = field; sortAsc.value = true }
}

const vlanFilterOptions = computed(() => {
  const options: { label: string; value: string }[] = [
    { label: t('common.all'), value: 'all' },
    { label: '-', value: 'none' }
  ]
  vlans.value.forEach((v) => {
    options.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id })
  })
  return options
})

function getVlan(vlanId: string | undefined) {
  if (!vlanId) return null
  return vlans.value.find((v) => v.id === vlanId)
}

const filteredItems = computed(() => {
  let result = items.value
  if (vlanFilter.value === 'none') result = result.filter((n) => !n.vlan_id)
  else if (vlanFilter.value !== 'all') result = result.filter((n) => n.vlan_id === vlanFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((n) => n.name?.toLowerCase().includes(q) || n.subnet?.toLowerCase().includes(q))
  }
  return result
})

const sortedItems = computed(() => {
  const list = [...filteredItems.value]
  list.sort((a, b) => {
    let va: string = (a[sortField.value] as string) || ''
    let vb: string = (b[sortField.value] as string) || ''
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return sortAsc.value ? -1 : 1
    if (va > vb) return sortAsc.value ? 1 : -1
    return 0
  })
  return list
})

const groupedItems = computed(() => {
  if (siteId.value !== 'all') return [{ siteId: '', siteName: '', items: sortedItems.value }]
  const groups: { siteId: string; siteName: string; items: Network[] }[] = []
  const groupMap = new Map<string, Network[]>()
  for (const item of sortedItems.value) {
    const sid = item.site_id || ''
    if (!groupMap.has(sid)) groupMap.set(sid, [])
    groupMap.get(sid)!.push(item)
  }
  for (const [sid, items] of groupMap) {
    groups.push({ siteId: sid, siteName: siteMap.value[sid] || sid, items })
  }
  return groups
})

function openDeleteDialog(network: Network) {
  deleteTarget.value = network
  deleteMessage.value = `${t('networks.delete')}: ${network.name} (${network.subnet})?`
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await remove(deleteTarget.value.id)
    toast.add({ title: t('networks.messages.deleted'), color: 'success' })
    showDeleteDialog.value = false
    await fetchNetworks(siteParams.value)
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  } finally { deleting.value = false }
}

watch([search, vlanFilter], () => {})
const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})
onMounted(async () => {
  const fetches: Promise<void>[] = [fetchNetworks(siteParams.value), fetchVlans(siteParams.value)]
  if (siteId.value === 'all') fetches.push(fetchAllSites())
  await Promise.all(fetches)
  pageLoading.value = false
})
</script>
