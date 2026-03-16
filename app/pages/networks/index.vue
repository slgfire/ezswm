<template>
  <div class="p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ $t('networks.title') }}</h1>
      <UButton to="/networks/create" icon="i-heroicons-plus">
        {{ $t('networks.create') }}
      </UButton>
    </div>

    <!-- Filters -->
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass"
        :placeholder="$t('common.search')"
        class="w-64"
      />
      <USelect
        v-model="vlanFilter"
        :options="vlanFilterOptions"
        :placeholder="$t('networks.fields.vlan')"
        class="w-48"
      />
    </div>

    <!-- Table -->
    <div class="mt-4">
      <UTable
        v-if="filteredItems.length > 0"
        :rows="paginatedItems"
        :columns="columns"
        :loading="loading"
      >
        <template #name-data="{ row }">
          <NuxtLink :to="`/networks/${row.id}`" class="text-primary-400 hover:underline">
            {{ row.name }}
          </NuxtLink>
        </template>

        <template #subnet-data="{ row }">
          <code class="rounded bg-gray-800 px-1.5 py-0.5 text-sm">{{ row.subnet }}</code>
        </template>

        <template #gateway-data="{ row }">
          {{ row.gateway || '-' }}
        </template>

        <template #vlan-data="{ row }">
          <VlanBadge
            v-if="getVlan(row.vlan_id)"
            :vlan-id="getVlan(row.vlan_id).vlan_id"
            :name="getVlan(row.vlan_id).name"
            :color="getVlan(row.vlan_id).color"
          />
          <span v-else class="text-gray-500">-</span>
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              icon="i-heroicons-pencil-square"
              variant="ghost"
              size="xs"
              :to="`/networks/${row.id}`"
              :aria-label="$t('common.edit')"
            />
            <UButton
              icon="i-heroicons-trash"
              variant="ghost"
              color="red"
              size="xs"
              :aria-label="$t('common.delete')"
              @click="openDeleteDialog(row)"
            />
          </div>
        </template>
      </UTable>

      <SharedEmptyState
        v-else-if="!loading"
        icon="i-heroicons-globe-alt"
        :title="$t('networks.emptyTitle')"
        :description="$t('networks.emptyDescription')"
      >
        <template #action>
          <UButton to="/networks/create" icon="i-heroicons-plus">
            {{ $t('networks.create') }}
          </UButton>
        </template>
      </SharedEmptyState>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between">
      <span class="text-sm text-gray-400">
        {{ $t('common.showing', { from: (page - 1) * perPage + 1, to: Math.min(page * perPage, filteredItems.length), total: filteredItems.length }) }}
      </span>
      <UPagination v-model="page" :total="filteredItems.length" :page-count="perPage" />
    </div>

    <!-- Delete confirmation -->
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
const page = ref(1)
const perPage = 25
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const deleteMessage = ref('')
const deleting = ref(false)

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

const columns = computed(() => [
  { key: 'name', label: t('networks.fields.name'), sortable: true },
  { key: 'subnet', label: t('networks.fields.subnet'), sortable: true },
  { key: 'gateway', label: t('networks.fields.gateway') },
  { key: 'vlan', label: t('networks.fields.vlan') },
  { key: 'actions', label: t('common.actions') }
])

function getVlan(vlanId: string) {
  if (!vlanId) return null
  return vlans.value.find((v: any) => v.id === vlanId)
}

const filteredItems = computed(() => {
  let result = items.value

  if (vlanFilter.value === 'none') {
    result = result.filter((n: any) => !n.vlan_id)
  } else if (vlanFilter.value !== 'all') {
    result = result.filter((n: any) => n.vlan_id === vlanFilter.value)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((n: any) =>
      n.name?.toLowerCase().includes(q) ||
      n.subnet?.toLowerCase().includes(q)
    )
  }

  return result
})

const totalPages = computed(() => Math.ceil(filteredItems.value.length / perPage))

const paginatedItems = computed(() => {
  const start = (page.value - 1) * perPage
  return filteredItems.value.slice(start, start + perPage)
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
  } finally {
    deleting.value = false
  }
}

watch([search, vlanFilter], () => {
  page.value = 1
})

onMounted(() => {
  Promise.all([fetchNetworks(), fetchVlans()])
})
</script>
