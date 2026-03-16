<template>
  <div class="p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ $t('vlans.title') }}</h1>
      <UButton to="/vlans/create" icon="i-heroicons-plus">
        {{ $t('vlans.create') }}
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
        v-model="statusFilter"
        :options="statusOptions"
        class="w-40"
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
        <template #vlan_id-data="{ row }">
          {{ row.vlan_id }}
        </template>

        <template #name-data="{ row }">
          <div class="flex items-center gap-2">
            <VlanColorSwatch :color="row.color" size="md" />
            <NuxtLink :to="`/vlans/${row.id}`" class="text-primary-400 hover:underline">
              {{ row.name }}
            </NuxtLink>
          </div>
        </template>

        <template #status-data="{ row }">
          <UBadge
            :color="row.status === 'active' ? 'green' : 'gray'"
            variant="subtle"
          >
            {{ row.status === 'active' ? $t('common.active') : $t('common.inactive') }}
          </UBadge>
        </template>

        <template #routing_device-data="{ row }">
          {{ row.routing_device || '-' }}
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              icon="i-heroicons-pencil-square"
              variant="ghost"
              size="xs"
              :to="`/vlans/${row.id}`"
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
        icon="i-heroicons-tag"
        :title="$t('vlans.emptyTitle')"
        :description="$t('vlans.emptyDescription')"
      >
        <template #action>
          <UButton to="/vlans/create" icon="i-heroicons-plus">
            {{ $t('vlans.create') }}
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
      :title="$t('vlans.delete')"
      :message="deleteMessage"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const { items, loading, fetch: fetchVlans, remove, getReferences } = useVlans()

const search = ref('')
const statusFilter = ref('all')
const page = ref(1)
const perPage = 25
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const deleteMessage = ref('')
const deleting = ref(false)

const statusOptions = computed(() => [
  { label: t('common.all'), value: 'all' },
  { label: t('common.active'), value: 'active' },
  { label: t('common.inactive'), value: 'inactive' }
])

const columns = computed(() => [
  { key: 'vlan_id', label: t('vlans.fields.vlanId'), sortable: true },
  { key: 'name', label: t('vlans.fields.name'), sortable: true },
  { key: 'status', label: t('vlans.fields.status') },
  { key: 'routing_device', label: t('vlans.fields.routingDevice') },
  { key: 'actions', label: t('common.actions') }
])

const filteredItems = computed(() => {
  let result = items.value

  if (statusFilter.value !== 'all') {
    result = result.filter((v: any) => v.status === statusFilter.value)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((v: any) =>
      String(v.vlan_id).includes(q) ||
      v.name?.toLowerCase().includes(q) ||
      v.routing_device?.toLowerCase().includes(q)
    )
  }

  return result
})

const totalPages = computed(() => Math.ceil(filteredItems.value.length / perPage))

const paginatedItems = computed(() => {
  const start = (page.value - 1) * perPage
  return filteredItems.value.slice(start, start + perPage)
})

async function openDeleteDialog(vlan: any) {
  deleteTarget.value = vlan
  deleteMessage.value = `${t('vlans.delete')}: ${vlan.name} (VLAN ${vlan.vlan_id})?`
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await remove(deleteTarget.value.id)
    toast.add({ title: t('vlans.messages.deleted'), color: 'green' })
    showDeleteDialog.value = false
    await fetchVlans()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    deleting.value = false
  }
}

watch([search, statusFilter], () => {
  page.value = 1
})

onMounted(() => {
  fetchVlans()
})
</script>
