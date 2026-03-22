<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          size="sm"
          to="/switches"
          :aria-label="$t('common.back')"
        />
        <h1 class="text-xl font-bold">
          {{ item?.name || $t('common.loading') }}
        </h1>
      </div>
      <div v-if="item" class="flex items-center gap-1">
        <UTooltip :text="showDetails ? $t('common.hideDetails') : $t('common.showDetails')">
          <UButton
            icon="i-heroicons-information-circle"
            :variant="showDetails ? 'solid' : 'ghost'"
            color="blue"
            size="sm"
            @click="showDetails = !showDetails"
          />
        </UTooltip>
        <UTooltip :text="$t('common.edit')">
          <UButton
            icon="i-heroicons-pencil"
            variant="ghost"
            color="primary"
            size="sm"
            @click="openEditPanel"
          />
        </UTooltip>
        <UTooltip :text="$t('common.duplicate')">
          <UButton
            icon="i-heroicons-document-duplicate"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="onDuplicate"
          />
        </UTooltip>
        <UTooltip :text="$t('common.delete')">
          <UButton
            icon="i-heroicons-trash"
            variant="ghost"
            color="red"
            size="sm"
            @click="showDeleteDialog = true"
          />
        </UTooltip>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
      <span class="ml-2 text-gray-400">{{ $t('common.loading') }}</span>
    </div>

    <!-- Switch details -->
    <div v-if="item && !loading" class="space-y-4">
      <!-- Info bar -->
      <div class="-mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-800/30">
        <div v-if="item.model">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.model') }}</div>
          <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model }}</div>
        </div>
        <div v-if="item.model && (item.location || item.management_ip)" class="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <div v-if="item.location">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.location') }}</div>
          <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.location }}{{ item.rack_position ? ` / ${item.rack_position}` : '' }}</div>
        </div>
        <div v-if="item.location && item.management_ip" class="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <div v-if="item.management_ip">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.managementIp') }}</div>
          <div class="font-mono text-sm font-bold text-gray-900 dark:text-white">{{ item.management_ip }}</div>
        </div>
        <div v-if="item.ports?.length" class="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <div v-if="item.ports?.length">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.ports') }}</div>
          <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            {{ item.ports.length }}
            <span class="flex items-center gap-1.5 text-xs font-normal">
              <span v-if="portStats.up" class="flex items-center gap-0.5 text-green-500"><span class="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />{{ portStats.up }}</span>
              <span v-if="portStats.down" class="flex items-center gap-0.5 text-gray-400"><span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />{{ portStats.down }}</span>
              <span v-if="portStats.disabled" class="flex items-center gap-0.5 text-red-400"><span class="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />{{ portStats.disabled }}</span>
            </span>
          </div>
        </div>
        <div v-if="currentTemplateName" class="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <div v-if="currentTemplateName">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.template') }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-300">{{ currentTemplateName }}</div>
        </div>
      </div>

      <!-- Details panel (toggled via info button in header) -->
      <div v-show="showDetails" class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/30">
        <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.name') }}</dt>
            <dd>{{ item.name }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.model') }}</dt>
            <dd>{{ item.model || '-' }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.manufacturer') }}</dt>
            <dd>{{ item.manufacturer || '-' }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.serialNumber') }}</dt>
            <dd>{{ item.serial_number || '-' }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.location') }}</dt>
            <dd>{{ item.location || '-' }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.rackPosition') }}</dt>
            <dd>{{ item.rack_position || '-' }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.managementIp') }}</dt>
            <dd class="font-mono">{{ item.management_ip || '-' }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.firmwareVersion') }}</dt>
            <dd>{{ item.firmware_version || '-' }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.layoutTemplate') }}</dt>
            <dd>{{ currentTemplateName || '-' }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.role') }}</dt>
            <dd>
              <UBadge v-if="item.role" :color="roleColor(item.role)" variant="subtle" size="xs">
                {{ $t(`switches.roles.${item.role}`) }}
              </UBadge>
              <span v-else>-</span>
            </dd>
          </div>
          <div v-if="item.tags?.length" class="col-span-2 sm:col-span-3 lg:col-span-4">
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.tags') }}</dt>
            <dd class="flex flex-wrap gap-1 pt-0.5">
              <UBadge v-for="tg in item.tags" :key="tg" color="neutral" variant="soft" size="xs">{{ tg }}</UBadge>
            </dd>
          </div>
          <div v-if="item.notes" class="col-span-2 sm:col-span-3 lg:col-span-4">
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('common.notes') }}</dt>
            <dd class="whitespace-pre-wrap">{{ item.notes }}</dd>
          </div>
        </div>

      </div>

      <!-- Selection bar (shown when ports are selected) -->
      <div v-if="selectedPorts.length > 0" class="flex items-center justify-between rounded-lg border border-primary-300 bg-primary-50 px-4 py-2 dark:border-primary-500/30 dark:bg-primary-500/10">
        <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
          {{ selectedPorts.length }} port{{ selectedPorts.length > 1 ? 's' : '' }} selected
        </span>
        <div class="flex items-center gap-2">
          <UButton size="xs" variant="soft" @click="bulkEditorRef?.open()">
            {{ $t('switches.ports.bulkEdit') }}
          </UButton>
          <UButton size="xs" variant="soft" color="red" @click="bulkReset">
            {{ $t('switches.ports.bulkReset') }}
          </UButton>
          <UButton size="xs" variant="ghost" color="neutral" @click="selectedPorts = []">
            {{ $t('common.clear') }}
          </UButton>
        </div>
      </div>

      <!-- Bulk Editor Sidebar -->
      <SwitchPortBulkEditor
        ref="bulkEditorRef"
        :switch-id="id"
        :selected-ports="selectedPorts"
        @saved="fetchSwitch"
        @clear-selection="selectedPorts = []"
      />

      <!-- Port Visualization -->
      <div>
        <SwitchPortGrid
          v-if="item.ports && item.ports.length"
          :ports="item.ports"
          :units="templateUnits"
          :vlans="vlans"
          :selected-ports="selectedPorts"
          @select-port="onSelectPort"
          @toggle-select="onToggleSelect"
        />
        <p v-else class="text-sm text-gray-400">{{ $t('switches.ports.noPortsMessage') }}</p>
      </div>

    </div>

    <!-- Port Side Panel -->
    <SwitchPortSidePanel
      v-model="showPortPanel"
      :port="selectedPort"
      :switch-id="id"
      @saved="fetchSwitch"
    />

    <!-- Edit Side Panel -->
    <USlideover :open="editMode" @close="editMode = false">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ $t('switches.edit') }}</h3>
          <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" @click="editMode = false" />
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UFormField :label="$t('switches.fields.name') + ' *'" name="name">
            <UInput v-model="editForm.name" required />
          </UFormField>

          <UFormField :label="$t('switches.fields.model')" name="model">
            <UInput v-model="editForm.model" />
          </UFormField>

          <UFormField :label="$t('switches.fields.manufacturer')" name="manufacturer">
            <UInput v-model="editForm.manufacturer" />
          </UFormField>

          <UFormField :label="$t('switches.fields.serialNumber')" name="serial_number">
            <UInput v-model="editForm.serial_number" />
          </UFormField>

          <UFormField :label="$t('switches.fields.location')" name="location">
            <UInput v-model="editForm.location" />
          </UFormField>

          <UFormField :label="$t('switches.fields.rackPosition')" name="rack_position">
            <UInput v-model="editForm.rack_position" />
          </UFormField>

          <UFormField :label="$t('switches.fields.managementIp')" name="management_ip">
            <UInput v-model="editForm.management_ip" />
          </UFormField>

          <UFormField :label="$t('switches.fields.firmwareVersion')" name="firmware_version">
            <UInput v-model="editForm.firmware_version" />
          </UFormField>

          <UFormField :label="$t('switches.fields.layoutTemplate')" name="layout_template_id">
            <USelectMenu :search-input="false"
              v-model="editForm.layout_template_id"
              :items="templateOptions"
              option-attribute="label"
              value-attribute="value"
            />
          </UFormField>

          <UFormField :label="$t('switches.fields.role')" name="role">
            <USelectMenu :search-input="false"
              v-model="editForm.role"
              :items="editRoleOptions"
              option-attribute="label"
              value-attribute="value"
            />
          </UFormField>

          <UFormField :label="$t('switches.fields.tags')" name="tags">
            <UInput
              v-model="editTagInput"
              :placeholder="$t('switches.tagsPlaceholder')"
              @keydown.enter.prevent="addEditTag"
            />
            <div v-if="editForm.tags.length > 0" class="mt-2 flex flex-wrap gap-1">
              <UBadge v-for="tg in editForm.tags" :key="tg" color="neutral" variant="soft" size="xs" class="cursor-pointer" @click="removeEditTag(tg)">
                {{ tg }} <UIcon name="i-heroicons-x-mark" class="ml-0.5 h-3 w-3" />
              </UBadge>
            </div>
          </UFormField>

          <UFormField :label="$t('common.notes')" name="notes">
            <UTextarea v-model="editForm.notes" :rows="3" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="editMode = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="saving" icon="i-heroicons-check" @click="onSave">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </USlideover>

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
const { items: templates, fetch: fetchTemplates } = useLayoutTemplates()
const { items: vlans, fetch: fetchVlans } = useVlans()

const editMode = ref(false)
const saving = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)
const showDetails = ref(false)

const selectedPorts = ref<string[]>([])
const bulkEditorRef = ref<any>(null)
const showPortPanel = ref(false)
const selectedPort = ref<any>(null)
const templateUnits = ref<any[]>([])
const portStats = computed(() => {
  const ports = item.value?.ports || []
  return {
    up: ports.filter((p: any) => p.status === 'up').length,
    down: ports.filter((p: any) => p.status === 'down').length,
    disabled: ports.filter((p: any) => p.status === 'disabled').length
  }
})

const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))

watch(item, (sw) => {
  if (sw?.name) {
    breadcrumbOverrides.value[`/switches/${id}`] = sw.name
  }
}, { immediate: true })

function onSelectPort(portId: string) {
  const port = item.value?.ports?.find((p: any) => p.id === portId)
  if (port) {
    selectedPort.value = port
    showPortPanel.value = true
  }
}

async function bulkReset() {
  if (!window.confirm(t('switches.ports.confirmBulkReset', { count: selectedPorts.value.length }))) return
  try {
    for (const portId of selectedPorts.value) {
      await $fetch(`/api/switches/${id}/ports/${portId}`, { method: 'DELETE' })
    }
    toast.add({ title: t('switches.ports.bulkResetDone', { count: selectedPorts.value.length }), color: 'green' })
    selectedPorts.value = []
    await fetchSwitch()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'red' })
  }
}

function onToggleSelect(portId: string) {
  const idx = selectedPorts.value.indexOf(portId)
  if (idx >= 0) selectedPorts.value.splice(idx, 1)
  else selectedPorts.value.push(portId)
}

const editTagInput = ref('')

const editForm = reactive({
  name: '',
  model: '',
  manufacturer: '',
  serial_number: '',
  location: '',
  rack_position: '',
  management_ip: '',
  firmware_version: '',
  layout_template_id: '',
  role: '',
  tags: [] as string[],
  notes: ''
})

const editRoleOptions = computed(() => [
  { label: '---', value: '' },
  { label: t('switches.roles.core'), value: 'core' },
  { label: t('switches.roles.distribution'), value: 'distribution' },
  { label: t('switches.roles.access'), value: 'access' },
  { label: t('switches.roles.management'), value: 'management' }
])

function roleColor(role: string): string {
  const map: Record<string, string> = { core: 'red', distribution: 'orange', access: 'blue', management: 'purple' }
  return map[role] || 'gray'
}

function addEditTag() {
  const tag = editTagInput.value.trim()
  if (tag && !editForm.tags.includes(tag)) {
    editForm.tags.push(tag)
  }
  editTagInput.value = ''
}

function removeEditTag(tag: string) {
  editForm.tags = editForm.tags.filter(t => t !== tag)
}

const currentTemplateName = computed(() => {
  if (!item.value?.layout_template_id) return null
  const tpl = templates.value.find(t => t.id === item.value!.layout_template_id)
  return tpl?.name || item.value.layout_template_id
})

const templateOptions = computed(() => {
  const options = [{ label: '---', value: '' }]
  for (const tpl of templates.value) {
    options.push({ label: tpl.name, value: tpl.id })
  }
  return options
})

function openEditPanel() {
  if (!item.value) return
  editForm.name = item.value.name || ''
  editForm.model = item.value.model || ''
  editForm.manufacturer = item.value.manufacturer || ''
  editForm.serial_number = item.value.serial_number || ''
  editForm.location = item.value.location || ''
  editForm.rack_position = item.value.rack_position || ''
  editForm.management_ip = item.value.management_ip || ''
  editForm.firmware_version = item.value.firmware_version || ''
  editForm.layout_template_id = item.value.layout_template_id || ''
  editForm.role = item.value.role || ''
  editForm.tags = [...(item.value.tags || [])]
  editForm.notes = item.value.notes || ''
  editTagInput.value = ''
  editMode.value = true
}

async function onSave() {
  if (!editForm.name.trim()) return

  saving.value = true
  try {
    const body: Record<string, any> = { ...editForm, tags: [...editForm.tags] }
    // Remove empty optional fields but keep layout_template_id to allow clearing
    for (const key of Object.keys(body)) {
      if (body[key] === '' && key !== 'layout_template_id') {
        delete body[key]
      }
      if (Array.isArray(body[key]) && body[key].length === 0) {
        delete body[key]
      }
    }
    if (body.layout_template_id === '') {
      delete body.layout_template_id
    }
    await update(body)
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

watch([item, templates], () => {
  if (item.value?.layout_template_id) {
    const tpl = templates.value.find(t => t.id === item.value!.layout_template_id)
    templateUnits.value = tpl?.units || []
  } else {
    templateUnits.value = []
  }
}, { immediate: true })

onMounted(() => {
  fetchSwitch()
  fetchTemplates()
  fetchVlans()
})
</script>
