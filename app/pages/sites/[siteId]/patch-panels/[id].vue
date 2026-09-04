<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" size="sm" :to="`/sites/${siteId}/patch-panels`" :aria-label="$t('common.back')" />
        <h1 class="text-xl font-bold">{{ panel?.name || $t('common.loading') }}</h1>
      </div>
      <div v-if="panel" class="flex items-center gap-1">
        <UButton icon="i-heroicons-pencil" variant="ghost" color="primary" size="sm" :title="$t('common.edit')" @click="startEdit()" />
        <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" :title="$t('common.delete')" @click="void (showDeleteDialog = true)" />
      </div>
    </div>

    <div v-if="pageLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="panel" class="space-y-5">
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="card-glow rounded-lg bg-default p-5">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/10">
              <UIcon name="i-heroicons-signal" class="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <div class="font-display text-3xl font-bold">{{ kpi.occupied }}</div>
              <div class="text-sm text-gray-400">{{ $t('patchPanels.kpi.occupied') }}</div>
            </div>
          </div>
        </div>
        <div class="card-glow rounded-lg bg-default p-5">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10">
              <UIcon name="i-heroicons-signal-slash" class="h-6 w-6 text-cyan-500" />
            </div>
            <div>
              <div class="font-display text-3xl font-bold text-cyan-500">{{ kpi.free }}</div>
              <div class="text-sm text-gray-400">{{ $t('patchPanels.kpi.free') }}</div>
            </div>
          </div>
        </div>
        <div class="card-glow rounded-lg bg-default p-5">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <UIcon name="i-heroicons-check-circle" class="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div class="font-display text-3xl font-bold text-green-500">{{ kpi.tested }}</div>
              <div class="text-sm text-gray-400">{{ $t('patchPanels.kpi.tested') }}</div>
            </div>
          </div>
        </div>
        <div class="card-glow rounded-lg bg-default p-5">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <UIcon name="i-heroicons-question-mark-circle" class="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <div class="font-display text-3xl font-bold text-amber-500">{{ kpi.untested }}</div>
              <div class="text-sm text-gray-400">{{ $t('patchPanels.kpi.untested') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <p v-if="panel.description" class="text-sm text-gray-500 dark:text-gray-400">{{ panel.description }}</p>

      <!-- Socket table -->
      <div>
        <h2 class="mb-3 text-base font-semibold text-gray-700 dark:text-gray-300">{{ $t('patchPanels.sockets') }}</h2>
        <UTable
          :data="tableRows"
          :columns="columns"
          :ui="{ tr: 'cursor-pointer' }"
          class="rounded-lg border border-default bg-default"
          @select="onRowSelect"
        >
          <template #port_number-cell="{ row }">
            <span class="font-mono font-medium text-gray-900 dark:text-white">{{ row.original.port_number }}</span>
          </template>
          <template #side-cell="{ row }">
            <UBadge :color="row.original.side === 'L' ? 'primary' : 'info'" variant="subtle" size="sm">
              {{ row.original.side }}
            </UBadge>
          </template>
          <template #outlet_number-cell="{ row }">
            <span v-if="row.original.outlet_number" class="font-mono text-sm">{{ row.original.outlet_number }}</span>
            <span v-else class="text-gray-400">—</span>
          </template>
          <template #location-cell="{ row }">
            <span v-if="row.original.location" class="text-sm">{{ row.original.location }}</span>
            <span v-else class="text-gray-400">—</span>
          </template>
          <template #tested-cell="{ row }">
            <UBadge :color="row.original.tested ? 'success' : 'neutral'" variant="subtle" size="sm">
              {{ row.original.tested ? $t('patchPanels.tested') : $t('patchPanels.untested') }}
            </UBadge>
          </template>
        </UTable>
      </div>
    </div>

    <!-- Edit slideover -->
    <USlideover :open="editing" @update:open="onEditOpenChange">
      <template #title>
        <span>{{ $t('patchPanels.edit') }}</span>
      </template>
      <template #body>
        <UForm ref="editFormRef" :state="editForm" :validate="validateEdit" :validate-on="['blur', 'change']" novalidate class="space-y-4" @submit="onSaveEdit">
          <UFormField :label="$t('common.name')" name="name" required>
            <UInput v-model="editForm.name" required class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.description')" name="description">
            <UTextarea v-model="editForm.description" :rows="2" class="w-full" />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="subtle" color="neutral" @click="requestCloseEdit">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="savingEdit" @click="editFormRef?.submit()">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>

    <!-- Socket edit slideover -->
    <USlideover :open="showSocketEdit" @update:open="onSocketOpenChange">
      <template #title>
        <span v-if="socketEditTarget">{{ $t('patchPanels.socketTitle', { port: socketEditTarget.port_number, side: socketEditTarget.side }) }}</span>
      </template>
      <template #body>
        <div v-if="socketEditError" class="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {{ socketEditError }}
        </div>
        <form class="space-y-4" @submit.prevent="onSaveSocket">
          <UFormField :label="$t('patchPanels.fields.outletNumber')">
            <UInput v-model="socketForm.outlet_number" class="w-full" :placeholder="$t('patchPanels.fields.outletNumberPlaceholder')" />
          </UFormField>
          <UFormField :label="$t('patchPanels.fields.location')">
            <UInput v-model="socketForm.location" class="w-full" :placeholder="$t('patchPanels.fields.locationPlaceholder')" />
          </UFormField>
          <UFormField :label="$t('patchPanels.fields.tested')">
            <USwitch v-model="socketForm.tested" />
          </UFormField>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="subtle" color="neutral" @click="requestCloseSocket">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="savingSocket" @click="onSaveSocket">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>

    <!-- Delete confirmation -->
    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('patchPanels.delete')"
      :message="panel ? `${$t('patchPanels.delete')}: ${panel.name}?` : ''"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { PatchPanelSocket } from '~~/types/patchPanel'

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const siteId = computed(() => route.params.siteId as string)
const panelId = route.params.id as string

const { item: panel, fetch: fetchPanel, updateSocket } = usePatchPanel(panelId, siteId.value)
const { update: updatePanel, remove: removePanel } = usePatchPanels()

const pageLoading = ref(true)

useHead({ title: computed(() => panel.value?.name || t('patchPanels.title')) })

// KPIs
const kpi = computed(() => {
  if (!panel.value) return { occupied: 0, free: 0, tested: 0, untested: 0 }
  const sockets = panel.value.sockets
  const occupied = sockets.filter(s => s.outlet_number || s.location).length
  const tested = sockets.filter(s => s.tested).length
  return {
    occupied,
    free: sockets.length - occupied,
    tested,
    untested: sockets.length - tested
  }
})

// Table
const tableRows = computed<PatchPanelSocket[]>(() => {
  if (!panel.value) return []
  return [...panel.value.sockets].sort((a, b) => a.port_number - b.port_number || a.side.localeCompare(b.side))
})

const columns = computed<TableColumn<PatchPanelSocket>[]>(() => [
  { accessorKey: 'port_number', header: t('patchPanels.fields.port') },
  { accessorKey: 'side', header: t('patchPanels.fields.side') },
  { accessorKey: 'outlet_number', header: t('patchPanels.fields.outletNumber') },
  { accessorKey: 'location', header: t('patchPanels.fields.location') },
  { accessorKey: 'tested', header: t('patchPanels.fields.tested') }
])

function onRowSelect(_e: Event, row: TableRow<PatchPanelSocket>) {
  openSocketEdit(row.original)
}

// Panel edit
const editing = ref(false)
const editFormRef = ref<{ submit: () => void } | null>(null)
const savingEdit = ref(false)
const editForm = ref({ name: '', description: '' })

const { takeSnapshot: snapshotEdit, requestClose: requestCloseEdit, onOpenChange: onEditOpenChange } = useSlideoverGuard(
  editForm,
  () => { editing.value = false }
)

function startEdit() {
  if (!panel.value) return
  editForm.value = { name: panel.value.name, description: panel.value.description || '' }
  editing.value = true
  snapshotEdit()
}

function validateEdit(state: typeof editForm.value) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  return errors
}

async function onSaveEdit() {
  savingEdit.value = true
  try {
    await updatePanel(panelId, {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || null
    }, siteId.value)
    toast.add({ title: t('patchPanels.messages.updated'), color: 'success' })
    editing.value = false
    await fetchPanel()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    savingEdit.value = false
  }
}

// Socket edit
const showSocketEdit = ref(false)
const socketEditTarget = ref<PatchPanelSocket | null>(null)
const socketForm = ref({ outlet_number: '', location: '', tested: false })
const socketEditError = ref('')
const savingSocket = ref(false)

const { takeSnapshot: snapshotSocket, requestClose: requestCloseSocket, onOpenChange: onSocketOpenChange } = useSlideoverGuard(
  socketForm,
  () => { showSocketEdit.value = false; socketEditTarget.value = null }
)

function openSocketEdit(socket: PatchPanelSocket) {
  socketEditTarget.value = socket
  socketForm.value = {
    outlet_number: socket.outlet_number || '',
    location: socket.location || '',
    tested: socket.tested
  }
  socketEditError.value = ''
  showSocketEdit.value = true
  snapshotSocket()
}

async function onSaveSocket() {
  if (!socketEditTarget.value) return
  socketEditError.value = ''
  savingSocket.value = true
  try {
    await updateSocket(socketEditTarget.value.id, {
      outlet_number: socketForm.value.outlet_number.trim() || null,
      location: socketForm.value.location.trim() || null,
      tested: socketForm.value.tested
    })
    toast.add({ title: t('patchPanels.messages.socketUpdated'), color: 'success' })
    showSocketEdit.value = false
    socketEditTarget.value = null
    await fetchPanel()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    socketEditError.value = error?.data?.message || t('errors.serverError')
  } finally {
    savingSocket.value = false
  }
}

// Delete
const showDeleteDialog = ref(false)
const deleting = ref(false)

async function confirmDelete() {
  if (!panel.value) return
  deleting.value = true
  try {
    await removePanel(panel.value.id, siteId.value)
    toast.add({ title: t('patchPanels.messages.deleted'), color: 'success' })
    showDeleteDialog.value = false
    await router.push(`/sites/${siteId.value}/patch-panels`)
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  try {
    await fetchPanel()
    if (!panel.value) {
      toast.add({ title: t('errors.notFound'), color: 'error' })
      await router.push(`/sites/${siteId.value}/patch-panels`)
    }
  } catch {
    toast.add({ title: t('errors.notFound'), color: 'error' })
    await router.push(`/sites/${siteId.value}/patch-panels`)
  } finally {
    pageLoading.value = false
  }
})
</script>
