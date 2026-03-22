<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('vlans.title') }}</h1>
      <UButton to="/vlans/create" icon="i-heroicons-plus" size="sm">
        {{ $t('vlans.create') }}
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
        v-model="statusFilter"
        :items="statusOptions"
        size="sm"
        class="w-40"
      />
    </div>

    <!-- VLAN List -->
    <div v-if="sortedItems.length > 0" class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/30">
      <!-- Sort header -->
      <div class="flex items-center gap-4 border-b border-gray-100 px-5 py-2 text-[11px] uppercase tracking-wider text-gray-400 dark:border-gray-700/50">
        <button class="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200" @click="toggleSort('vlan_id')">
          {{ $t('vlans.sortId') }}
          <UIcon v-if="sortField === 'vlan_id'" :name="sortAsc ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
        </button>
        <button class="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200" @click="toggleSort('name')">
          {{ $t('vlans.sortName') }}
          <UIcon v-if="sortField === 'name'" :name="sortAsc ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
        </button>
        <button class="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200" @click="toggleSort('status')">
          {{ $t('vlans.sortStatus') }}
          <UIcon v-if="sortField === 'status'" :name="sortAsc ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
        </button>
      </div>

      <div
        v-for="(vlan, i) in sortedItems"
        :key="vlan.id"
        class="group flex cursor-pointer items-stretch pr-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        :class="i > 0 ? 'border-t border-gray-100 dark:border-gray-700/50' : ''"
        @click="openPanel(vlan, false)"
      >
        <!-- VLAN color left accent -->
        <div
          class="w-1 flex-shrink-0"
          :style="{ backgroundColor: vlan.color }"
          :class="[
            i === 0 ? 'rounded-tl-lg' : '',
            i === sortedItems.length - 1 ? 'rounded-bl-lg' : ''
          ]"
        />

        <!-- Main info -->
        <div class="min-w-0 flex-1 py-3 pl-4">
          <div class="flex items-center gap-3">
            <span class="text-lg font-bold" :style="{ color: vlan.color }">{{ vlan.vlan_id }}</span>
            <span class="text-base font-semibold text-gray-900 dark:text-white">{{ vlan.name }}</span>
            <UBadge :color="vlan.status === 'active' ? 'green' : 'gray'" variant="subtle" size="xs">
              {{ vlan.status === 'active' ? $t('common.active') : $t('common.inactive') }}
            </UBadge>
          </div>
          <div class="mt-0.5 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="getNetworksForVlan(vlan.id).length" class="flex items-center gap-1 text-primary-500">
              <UIcon name="i-heroicons-globe-alt" class="h-3 w-3" />
              {{ getNetworksForVlan(vlan.id).map(n => n.name).join(', ') }}
            </span>
            <span v-else class="flex items-center gap-1 text-yellow-500">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-3 w-3" />
              {{ $t('vlans.noNetwork') }}
            </span>
            <span v-if="vlan.routing_device" class="flex items-center gap-1">
              <UIcon name="i-heroicons-server" class="h-3 w-3 text-gray-400" />
              {{ vlan.routing_device }}
            </span>
            <span v-if="vlan.description" class="flex items-center gap-1 truncate">
              <UIcon name="i-heroicons-document-text" class="h-3 w-3 flex-shrink-0 text-gray-400" />
              {{ vlan.description }}
            </span>
          </div>
        </div>

        <!-- Actions (on hover) -->
        <div class="flex items-center gap-1 py-3 opacity-0 transition-opacity group-hover:opacity-100">
          <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click.stop="openPanel(vlan, true)" />
          <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs" @click.stop="openDeleteDialog(vlan)" />
        </div>
      </div>
    </div>

    <SharedEmptyState
      v-else-if="!loading"
      icon="i-heroicons-tag"
      :title="$t('vlans.emptyTitle')"
      :description="$t('vlans.emptyDescription')"
    >
      <template #action>
        <UButton to="/vlans/create" icon="i-heroicons-plus">{{ $t('vlans.create') }}</UButton>
      </template>
    </SharedEmptyState>

    <!-- VLAN Side Panel -->
    <USlideover v-model="showPanel">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <VlanColorSwatch v-if="selectedVlan" :color="panelEditing ? editForm.color : selectedVlan.color" size="lg" />
              <h3 class="font-semibold">
                {{ selectedVlan ? `VLAN ${selectedVlan.vlan_id} — ${selectedVlan.name}` : '' }}
              </h3>
            </div>
            <div class="flex items-center gap-1">
              <UTooltip v-if="!panelEditing" :text="$t('common.edit')">
                <UButton icon="i-heroicons-pencil" variant="ghost" color="primary" size="sm" @click="startEdit()" />
              </UTooltip>
              <UButton variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="panelEditing ? panelEditing = false : showPanel = false" />
            </div>
          </div>
        </template>

        <div v-if="selectedVlan && !panelEditing" class="space-y-4">
          <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('vlans.fields.vlanId') }}</dt>
              <dd class="font-medium">{{ selectedVlan.vlan_id }}</dd>
            </div>
            <div>
              <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('vlans.fields.name') }}</dt>
              <dd class="font-medium">{{ selectedVlan.name }}</dd>
            </div>
            <div>
              <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('vlans.fields.status') }}</dt>
              <dd>
                <UBadge :color="selectedVlan.status === 'active' ? 'green' : 'gray'" variant="subtle">
                  {{ selectedVlan.status === 'active' ? $t('common.active') : $t('common.inactive') }}
                </UBadge>
              </dd>
            </div>
            <div>
              <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('vlans.fields.color') }}</dt>
              <dd class="flex items-center gap-2">
                <VlanColorSwatch :color="selectedVlan.color" size="md" />
                <span class="font-mono text-xs">{{ selectedVlan.color }}</span>
              </dd>
            </div>
            <div v-if="selectedVlan.routing_device" class="col-span-2">
              <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('vlans.fields.routingDevice') }}</dt>
              <dd class="font-medium">{{ selectedVlan.routing_device }}</dd>
            </div>
            <div v-if="selectedVlan.description" class="col-span-2">
              <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('common.description') }}</dt>
              <dd>{{ selectedVlan.description }}</dd>
            </div>
          </div>

          <!-- Associated networks -->
          <div v-if="panelNetworks.length" class="border-t border-gray-200 pt-3 dark:border-gray-700">
            <div class="mb-2 text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.title') }}</div>
            <div class="space-y-1">
              <NuxtLink
                v-for="net in panelNetworks"
                :key="net.id"
                :to="`/networks/${net.id}`"
                class="block rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span class="font-medium text-primary-500">{{ net.name }}</span>
                <span class="ml-2 text-xs text-gray-400">{{ net.subnet }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Edit form -->
        <form v-if="panelEditing" class="space-y-4" @submit.prevent="onSave">
          <UFormField :label="$t('vlans.fields.vlanId') + ' *'">
            <UInput v-model.number="editForm.vlan_id" type="number" :min="1" :max="4094" required />
          </UFormField>
          <UFormField :label="$t('vlans.fields.name') + ' *'">
            <UInput v-model="editForm.name" required />
          </UFormField>
          <UFormField :label="$t('common.description')">
            <UTextarea v-model="editForm.description" :rows="2" />
          </UFormField>
          <UFormField :label="$t('vlans.fields.status')">
            <USelect v-model="editForm.status" :items="editStatusOptions" />
          </UFormField>
          <UFormField :label="$t('vlans.fields.routingDevice')">
            <UInput v-model="editForm.routing_device" />
          </UFormField>
          <UFormField :label="$t('vlans.fields.color') + ' *'">
            <div class="flex items-center gap-3">
              <input
                v-model="editForm.color"
                type="color"
                class="h-9 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
              />
              <UInput v-model="editForm.color" class="w-28" size="sm" />
            </div>
          </UFormField>
        </form>

        <template #footer>
          <div v-if="panelEditing" class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="panelEditing = false">{{ $t('common.cancel') }}</UButton>
            <UButton :loading="saving" @click="onSave">{{ $t('common.save') }}</UButton>
          </div>
        </template>
      </UCard>
    </USlideover>

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
const { items, loading, fetch: fetchVlans, update, remove } = useVlans()
const { items: allNetworks, fetch: fetchNetworks } = useNetworks()

const search = ref('')
const statusFilter = ref('all')
const page = ref(1)
const perPage = 25

// Panel state
const showPanel = ref(false)
const selectedVlan = ref<any>(null)
const panelEditing = ref(false)
const saving = ref(false)

// Delete state
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const deleteMessage = ref('')
const deleting = ref(false)

const editForm = ref({
  vlan_id: 0,
  name: '',
  description: '',
  status: 'active',
  routing_device: '',
  color: '#3498DB'
})

const statusOptions = computed(() => [
  { label: t('common.all'), value: 'all' },
  { label: t('common.active'), value: 'active' },
  { label: t('common.inactive'), value: 'inactive' }
])

const editStatusOptions = computed(() => [
  { label: t('common.active'), value: 'active' },
  { label: t('common.inactive'), value: 'inactive' }
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

const sortField = ref<'vlan_id' | 'name' | 'status'>('vlan_id')
const sortAsc = ref(true)

function toggleSort(field: 'vlan_id' | 'name' | 'status') {
  if (sortField.value === field) {
    sortAsc.value = !sortAsc.value
  } else {
    sortField.value = field
    sortAsc.value = true
  }
}

const sortedItems = computed(() => {
  const list = [...filteredItems.value]
  list.sort((a: any, b: any) => {
    let va = a[sortField.value]
    let vb = b[sortField.value]
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return sortAsc.value ? -1 : 1
    if (va > vb) return sortAsc.value ? 1 : -1
    return 0
  })
  return list
})

function getNetworksForVlan(vlanId: string) {
  return allNetworks.value.filter((n: any) => n.vlan_id === vlanId)
}

const panelNetworks = computed(() => {
  if (!selectedVlan.value) return []
  return allNetworks.value.filter((n: any) => n.vlan_id === selectedVlan.value.id)
})

function openPanel(vlan: any, edit: boolean) {
  selectedVlan.value = vlan
  panelEditing.value = edit
  if (edit) startEdit()
  showPanel.value = true
}

function startEdit() {
  if (!selectedVlan.value) return
  editForm.value = {
    vlan_id: selectedVlan.value.vlan_id,
    name: selectedVlan.value.name,
    description: selectedVlan.value.description || '',
    status: selectedVlan.value.status,
    routing_device: selectedVlan.value.routing_device || '',
    color: selectedVlan.value.color
  }
  panelEditing.value = true
}

async function onSave() {
  saving.value = true
  try {
    await update(selectedVlan.value.id, {
      vlan_id: editForm.value.vlan_id,
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || undefined,
      status: editForm.value.status,
      routing_device: editForm.value.routing_device.trim() || undefined,
      color: editForm.value.color.toUpperCase()
    })
    toast.add({ title: t('vlans.messages.updated'), color: 'green' })
    panelEditing.value = false
    await fetchVlans()
    // Update selected vlan with fresh data
    selectedVlan.value = items.value.find((v: any) => v.id === selectedVlan.value.id)
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    saving.value = false
  }
}

function openDeleteDialog(vlan: any) {
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
    showPanel.value = false
    await fetchVlans()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    deleting.value = false
  }
}

watch([search, statusFilter], () => { page.value = 1 })

onMounted(() => {
  fetchVlans()
  fetchNetworks()
})
</script>
