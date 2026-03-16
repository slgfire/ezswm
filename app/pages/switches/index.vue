<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ $t('switches.title') }}</h1>
      <UButton to="/switches/create" icon="i-heroicons-plus">
        {{ $t('switches.create') }}
      </UButton>
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <UInput
        v-model="search"
        :placeholder="$t('common.search')"
        icon="i-heroicons-magnifying-glass"
        class="w-64"
        @input="onSearch"
      />
      <UInput
        v-model="locationFilter"
        :placeholder="$t('switches.fields.location')"
        icon="i-heroicons-map-pin"
        class="w-48"
        @input="onSearch"
      />
    </div>

    <!-- Table -->
    <UCard v-if="filteredItems.length > 0 || loading">
      <UTable
        :columns="columns"
        :rows="filteredItems"
        :loading="loading"
      >
        <template #name-data="{ row }">
          <NuxtLink :to="`/switches/${row.id}`" class="font-medium text-primary hover:underline">
            {{ row.name }}
          </NuxtLink>
        </template>

        <template #portCount-data="{ row }">
          <UBadge variant="subtle" color="gray">
            {{ row.ports ? row.ports.length : 0 }}
          </UBadge>
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              icon="i-heroicons-eye"
              variant="ghost"
              size="xs"
              :to="`/switches/${row.id}`"
              :aria-label="$t('common.details')"
            />
            <UButton
              icon="i-heroicons-document-duplicate"
              variant="ghost"
              size="xs"
              :aria-label="$t('common.duplicate')"
              @click="onDuplicate(row)"
            />
            <UButton
              icon="i-heroicons-trash"
              variant="ghost"
              size="xs"
              color="red"
              :aria-label="$t('common.delete')"
              @click="confirmDelete(row)"
            />
          </div>
        </template>
      </UTable>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
        <span class="text-sm text-gray-400">
          {{ $t('common.showing', { from: (page - 1) * perPage + 1, to: Math.min(page * perPage, total), total }) }}
        </span>
        <UPagination v-model="page" :page-count="perPage" :total="total" />
      </div>
    </UCard>

    <!-- Empty state -->
    <SharedEmptyState
      v-if="!loading && filteredItems.length === 0"
      icon="i-heroicons-server-stack"
      :title="$t('switches.emptyTitle')"
      :description="$t('switches.emptyDescription')"
    >
      <template #action>
        <UButton to="/switches/create" icon="i-heroicons-plus">
          {{ $t('switches.create') }}
        </UButton>
      </template>
    </SharedEmptyState>

    <!-- Delete confirmation dialog -->
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
const { t } = useI18n()
const toast = useToast()
const { items, total, loading, fetch: fetchSwitches, remove, duplicate } = useSwitches()

const search = ref('')
const locationFilter = ref('')
const page = ref(1)
const perPage = ref(25)

const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const deleting = ref(false)

const columns = computed(() => [
  { key: 'name', label: t('switches.fields.name'), sortable: true },
  { key: 'model', label: t('switches.fields.model'), sortable: true },
  { key: 'location', label: t('switches.fields.location'), sortable: true },
  { key: 'management_ip', label: t('switches.fields.managementIp'), sortable: true },
  { key: 'portCount', label: t('switches.fields.portCount') },
  { key: 'actions', label: t('common.actions') }
])

const filteredItems = computed(() => {
  let result = items.value

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((item: any) =>
      item.name?.toLowerCase().includes(q) ||
      item.model?.toLowerCase().includes(q) ||
      item.management_ip?.toLowerCase().includes(q) ||
      item.serial_number?.toLowerCase().includes(q)
    )
  }

  if (locationFilter.value) {
    const loc = locationFilter.value.toLowerCase()
    result = result.filter((item: any) =>
      item.location?.toLowerCase().includes(loc)
    )
  }

  return result
})

const totalPages = computed(() => Math.ceil(total.value / perPage.value))

const deleteMessage = computed(() => {
  if (!deleteTarget.value) return ''
  return t('switches.delete') + ': ' + deleteTarget.value.name + '?'
})

function onSearch() {
  page.value = 1
}

function confirmDelete(row: any) {
  deleteTarget.value = row
  showDeleteDialog.value = true
}

async function onDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await remove(deleteTarget.value.id)
    toast.add({ title: t('switches.messages.deleted'), color: 'green' })
    showDeleteDialog.value = false
    deleteTarget.value = null
    await fetchSwitches()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    deleting.value = false
  }
}

async function onDuplicate(row: any) {
  try {
    const result = await duplicate(row.id)
    toast.add({ title: t('switches.messages.duplicated'), color: 'green' })
    await fetchSwitches()
    if (result && (result as any).id) {
      await navigateTo(`/switches/${(result as any).id}`)
    }
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'red' })
  }
}

onMounted(() => {
  fetchSwitches()
})
</script>
