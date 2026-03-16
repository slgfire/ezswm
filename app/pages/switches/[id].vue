<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          to="/switches"
          :aria-label="$t('common.back')"
        />
        <h1 class="text-2xl font-bold">
          {{ item?.name || $t('common.loading') }}
        </h1>
      </div>
      <div v-if="item" class="flex items-center gap-2">
        <UButton
          :icon="editMode ? 'i-heroicons-x-mark' : 'i-heroicons-pencil'"
          :variant="editMode ? 'solid' : 'outline'"
          @click="toggleEditMode"
        >
          {{ editMode ? $t('common.cancel') : $t('common.edit') }}
        </UButton>
        <UButton
          icon="i-heroicons-document-duplicate"
          variant="outline"
          @click="onDuplicate"
        >
          {{ $t('common.duplicate') }}
        </UButton>
        <UButton
          icon="i-heroicons-trash"
          color="red"
          variant="outline"
          @click="showDeleteDialog = true"
        >
          {{ $t('common.delete') }}
        </UButton>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
      <span class="ml-2 text-gray-400">{{ $t('common.loading') }}</span>
    </div>

    <!-- Switch details -->
    <div v-if="item && !loading" class="space-y-6">
      <!-- Info card -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">{{ $t('common.details') }}</h2>
        </template>

        <div v-if="!editMode" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-sm font-medium text-gray-400">{{ $t('switches.fields.name') }}</dt>
            <dd class="mt-1">{{ item.name }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-400">{{ $t('switches.fields.model') }}</dt>
            <dd class="mt-1">{{ item.model || '-' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-400">{{ $t('switches.fields.manufacturer') }}</dt>
            <dd class="mt-1">{{ item.manufacturer || '-' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-400">{{ $t('switches.fields.serialNumber') }}</dt>
            <dd class="mt-1">{{ item.serial_number || '-' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-400">{{ $t('switches.fields.location') }}</dt>
            <dd class="mt-1">{{ item.location || '-' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-400">{{ $t('switches.fields.rackPosition') }}</dt>
            <dd class="mt-1">{{ item.rack_position || '-' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-400">{{ $t('switches.fields.managementIp') }}</dt>
            <dd class="mt-1">{{ item.management_ip || '-' }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-400">{{ $t('switches.fields.firmwareVersion') }}</dt>
            <dd class="mt-1">{{ item.firmware_version || '-' }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-sm font-medium text-gray-400">{{ $t('common.notes') }}</dt>
            <dd class="mt-1 whitespace-pre-wrap">{{ item.notes || '-' }}</dd>
          </div>
        </div>

        <!-- Edit form -->
        <UForm v-if="editMode" :state="editForm" @submit="onSave">
          <div class="space-y-4">
            <UFormGroup :label="$t('switches.fields.name') + ' *'" name="name">
              <UInput v-model="editForm.name" required />
            </UFormGroup>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <UFormGroup :label="$t('switches.fields.model')" name="model">
                <UInput v-model="editForm.model" />
              </UFormGroup>

              <UFormGroup :label="$t('switches.fields.manufacturer')" name="manufacturer">
                <UInput v-model="editForm.manufacturer" />
              </UFormGroup>

              <UFormGroup :label="$t('switches.fields.serialNumber')" name="serial_number">
                <UInput v-model="editForm.serial_number" />
              </UFormGroup>

              <UFormGroup :label="$t('switches.fields.location')" name="location">
                <UInput v-model="editForm.location" />
              </UFormGroup>

              <UFormGroup :label="$t('switches.fields.rackPosition')" name="rack_position">
                <UInput v-model="editForm.rack_position" />
              </UFormGroup>

              <UFormGroup :label="$t('switches.fields.managementIp')" name="management_ip">
                <UInput v-model="editForm.management_ip" />
              </UFormGroup>

              <UFormGroup :label="$t('switches.fields.firmwareVersion')" name="firmware_version">
                <UInput v-model="editForm.firmware_version" />
              </UFormGroup>
            </div>

            <UFormGroup :label="$t('common.notes')" name="notes">
              <UTextarea v-model="editForm.notes" :rows="3" />
            </UFormGroup>

            <div class="flex justify-end gap-2 pt-2">
              <UButton color="gray" variant="ghost" @click="toggleEditMode">
                {{ $t('common.cancel') }}
              </UButton>
              <UButton type="submit" :loading="saving" icon="i-heroicons-check">
                {{ $t('common.save') }}
              </UButton>
            </div>
          </div>
        </UForm>
      </UCard>

      <!-- Bulk Editor -->
      <SwitchSwitchPortBulkEditor
        v-if="selectedPorts.length > 0"
        :switch-id="id"
        :selected-ports="selectedPorts"
        @saved="fetchSwitch"
        @clear-selection="selectedPorts = []"
      />

      <!-- Port Visualization -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ $t('switches.ports.title') }}</h2>
            <UBadge variant="subtle" color="gray">
              {{ item.ports ? item.ports.length : 0 }} ports
            </UBadge>
          </div>
        </template>

        <SwitchSwitchPortGrid
          v-if="item.ports && item.ports.length"
          :ports="item.ports"
          :units="templateUnits"
          :selected-ports="selectedPorts"
          @select-port="onSelectPort"
          @toggle-select="onToggleSelect"
        />
        <p v-else class="text-sm text-gray-400">No ports. Assign a layout template to generate ports.</p>
      </UCard>
    </div>

    <!-- Port Side Panel -->
    <SwitchSwitchPortSidePanel
      v-model="showPortPanel"
      :port="selectedPort"
      :switch-id="id"
      @saved="fetchSwitch"
    />

    <!-- Delete confirmation dialog -->
    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('switches.delete')"
      :message="$t('switches.delete') + ': ' + (item?.name || '') + '?'"
      :confirm-label="$t('common.delete')"
      :loading="deleting"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const route = useRoute()

const id = route.params.id as string
const { item, loading, fetch: fetchSwitch, update } = useSwitch(id)
const { duplicate } = useSwitches()

const editMode = ref(false)
const saving = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)

const selectedPorts = ref<string[]>([])
const showPortPanel = ref(false)
const selectedPort = ref<any>(null)
const templateUnits = ref<any[]>([])

function onSelectPort(portId: string) {
  const port = item.value?.ports?.find((p: any) => p.id === portId)
  if (port) {
    selectedPort.value = port
    showPortPanel.value = true
  }
}

function onToggleSelect(portId: string) {
  const idx = selectedPorts.value.indexOf(portId)
  if (idx >= 0) selectedPorts.value.splice(idx, 1)
  else selectedPorts.value.push(portId)
}

const editForm = reactive({
  name: '',
  model: '',
  manufacturer: '',
  serial_number: '',
  location: '',
  rack_position: '',
  management_ip: '',
  firmware_version: '',
  notes: ''
})

function toggleEditMode() {
  if (!editMode.value && item.value) {
    editForm.name = item.value.name || ''
    editForm.model = item.value.model || ''
    editForm.manufacturer = item.value.manufacturer || ''
    editForm.serial_number = item.value.serial_number || ''
    editForm.location = item.value.location || ''
    editForm.rack_position = item.value.rack_position || ''
    editForm.management_ip = item.value.management_ip || ''
    editForm.firmware_version = item.value.firmware_version || ''
    editForm.notes = item.value.notes || ''
  }
  editMode.value = !editMode.value
}

async function onSave() {
  if (!editForm.name.trim()) return

  saving.value = true
  try {
    await update({ ...editForm })
    toast.add({ title: t('switches.messages.updated'), color: 'green' })
    editMode.value = false
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    saving.value = false
  }
}

async function onDuplicate() {
  try {
    const result = await duplicate(id)
    toast.add({ title: t('switches.messages.duplicated'), color: 'green' })
    if (result && (result as any).id) {
      await navigateTo(`/switches/${(result as any).id}`)
    }
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'red' })
  }
}

async function onDelete() {
  deleting.value = true
  try {
    await $fetch(`/api/switches/${id}`, { method: 'DELETE' })
    toast.add({ title: t('switches.messages.deleted'), color: 'green' })
    showDeleteDialog.value = false
    await navigateTo('/switches')
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchSwitch()
})
</script>
