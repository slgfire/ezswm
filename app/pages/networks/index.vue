<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('networks.title') }}</h1>
      <UButton to="/networks/create" icon="i-heroicons-plus" size="sm">
        {{ $t('networks.create') }}
      </UButton>
    </div>

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
        :options="vlanFilterOptions"
        :placeholder="$t('networks.fields.vlan')"
        size="sm"
        class="w-48"
      />
    </div>

    <!-- Network List -->
    <div v-if="sortedItems.length > 0" class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/30">
      <!-- Sort header -->
      <div class="flex items-center gap-4 border-b border-gray-100 px-5 py-2 text-[11px] uppercase tracking-wider text-gray-400 dark:border-gray-700/50">
        <button class="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200" @click="toggleSort('name')">
          Name
          <UIcon v-if="sortField === 'name'" :name="sortAsc ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
        </button>
        <button class="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200" @click="toggleSort('subnet')">
          Subnet
          <UIcon v-if="sortField === 'subnet'" :name="sortAsc ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
        </button>
        <button class="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200" @click="toggleSort('gateway')">
          Gateway
          <UIcon v-if="sortField === 'gateway'" :name="sortAsc ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
        </button>
      </div>

      <!-- Rows -->
      <NuxtLink
        v-for="(net, i) in sortedItems"
        :key="net.id"
        :to="`/networks/${net.id}`"
        class="group flex items-stretch pr-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        :class="i > 0 ? 'border-t border-gray-100 dark:border-gray-700/50' : ''"
      >
        <!-- VLAN color left accent -->
        <div
          class="w-1 flex-shrink-0"
          :style="getVlan(net.vlan_id) ? { backgroundColor: getVlan(net.vlan_id).color } : {}"
          :class="[
            !getVlan(net.vlan_id) ? 'bg-transparent' : '',
            i === 0 ? 'rounded-tl-lg' : '',
            i === sortedItems.length - 1 ? 'rounded-bl-lg' : ''
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
              VLAN {{ getVlan(net.vlan_id).vlan_id }} — {{ getVlan(net.vlan_id).name }}
            </span>
            <span v-if="net.description" class="flex items-center gap-1 truncate">
              <UIcon name="i-heroicons-document-text" class="h-3 w-3 flex-shrink-0 text-gray-400" />
              {{ net.description }}
            </span>
          </div>
        </div>

        <!-- Actions (on hover) -->
        <div class="flex items-center gap-1 py-3 opacity-0 transition-opacity group-hover:opacity-100">
          <UButton icon="i-heroicons-pencil-square" variant="ghost" color="gray" size="xs" @click.prevent />
          <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs" @click.prevent="openDeleteDialog(net)" />
        </div>
      </NuxtLink>
    </div>

    <SharedEmptyState
      v-else-if="!loading"
      icon="i-heroicons-globe-alt"
      :title="$t('networks.emptyTitle')"
      :description="$t('networks.emptyDescription')"
    >
      <template #action>
        <UButton to="/networks/create" icon="i-heroicons-plus">{{ $t('networks.create') }}</UButton>
      </template>
    </SharedEmptyState>

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
const { t } = useI18n()
const toast = useToast()
const { items, loading, fetch: fetchNetworks, remove } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()

const search = ref('')
const vlanFilter = ref('all')
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
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
  vlans.value.forEach((v: any) => {
    options.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id })
  })
  return options
})

function getVlan(vlanId: string) {
  if (!vlanId) return null
  return vlans.value.find((v: any) => v.id === vlanId)
}

const filteredItems = computed(() => {
  let result = items.value
  if (vlanFilter.value === 'none') result = result.filter((n: any) => !n.vlan_id)
  else if (vlanFilter.value !== 'all') result = result.filter((n: any) => n.vlan_id === vlanFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((n: any) => n.name?.toLowerCase().includes(q) || n.subnet?.toLowerCase().includes(q))
  }
  return result
})

const sortedItems = computed(() => {
  const list = [...filteredItems.value]
  list.sort((a: any, b: any) => {
    let va = a[sortField.value] || ''
    let vb = b[sortField.value] || ''
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return sortAsc.value ? -1 : 1
    if (va > vb) return sortAsc.value ? 1 : -1
    return 0
  })
  return list
})

function openDeleteDialog(network: any) {
  deleteTarget.value = network
  deleteMessage.value = `${t('networks.delete')}: ${network.name} (${network.subnet})?`
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await remove(deleteTarget.value.id)
    toast.add({ title: t('networks.messages.deleted'), color: 'green' })
    showDeleteDialog.value = false
    await fetchNetworks()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally { deleting.value = false }
}

watch([search, vlanFilter], () => {})
onMounted(() => { Promise.all([fetchNetworks(), fetchVlans()]) })
</script>
