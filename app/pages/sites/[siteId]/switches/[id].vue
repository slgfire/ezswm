<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          size="sm"
          :to="`/sites/${siteId}/switches`"
          :aria-label="$t('common.back')"
        />
        <h1 class="text-xl font-bold">
          {{ item?.name || $t('common.loading') }}
        </h1>
      </div>
      <div v-if="item" class="flex items-center gap-1">
        <UTooltip :text="showDetails ? $t('common.hideDetails') : $t('common.showDetails')">
          <UButton
            :variant="showDetails ? 'solid' : 'ghost'"
            color="info"
            size="sm"
            @click="showDetails = !showDetails"
          >
            <UIcon name="i-heroicons-chevron-down" :class="['h-4 w-4 transition-transform duration-200', showDetails ? 'rotate-180' : '']" />
            <span class="ml-1">{{ showDetails ? $t('common.hideDetails') : $t('common.showDetails') }}</span>
          </UButton>
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
            color="error"
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
      <div class="-mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 list-container rounded-lg bg-default px-5 py-3">
        <div v-if="item.model">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.model') }}</div>
          <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model }}</div>
        </div>
        <div v-if="item.model && (item.location || item.management_ip)" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div v-if="item.location">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.location') }}</div>
          <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.location }}{{ item.rack_position ? ` / ${item.rack_position}` : '' }}</div>
        </div>
        <div v-if="item.location && item.management_ip" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div v-if="item.management_ip">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.managementIp') }}</div>
          <div class="font-mono text-sm font-bold text-gray-900 dark:text-white">{{ item.management_ip }}</div>
        </div>
        <div v-if="item.ports?.length" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
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
        <div v-if="currentTemplateName" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div v-if="currentTemplateName">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.template') }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-300">{{ currentTemplateName }}</div>
        </div>
      </div>

      <!-- Details panel (toggled via info button in header) -->
      <div v-show="showDetails" class="list-container rounded-lg bg-default p-4">
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
              <UBadge v-if="item.role" :color="roleColor(item.role)" variant="subtle" size="sm">
                {{ $t(`switches.roles.${item.role}`) }}
              </UBadge>
              <span v-else>-</span>
            </dd>
          </div>
          <div v-if="item.tags?.length" class="col-span-2 sm:col-span-3 lg:col-span-4">
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.tags') }}</dt>
            <dd class="flex flex-wrap gap-1 pt-0.5">
              <UBadge v-for="tg in item.tags" :key="tg" color="neutral" variant="soft" size="sm">{{ tg }}</UBadge>
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
          <UButton
            size="xs"
            variant="soft"
            color="info"
            :disabled="!canCreateLag.allowed"
            @click="lagSlideoverRef?.openCreate(selectedPorts)"
          >
            {{ $t('lag.create') }}
          </UButton>
          <span v-if="!canCreateLag.allowed" class="text-xs text-amber-500">
            {{ canCreateLag.reason }}
          </span>
          <UButton size="xs" variant="soft" @click="bulkEditorRef?.open()">
            {{ $t('switches.ports.bulkEdit') }}
          </UButton>
          <UButton size="xs" variant="soft" color="error" @click="bulkReset">
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
          :lag-groups="lagGroups"
          :lag-by-port-id="lagByPortId"
          @select-port="onSelectPort"
          @toggle-select="onToggleSelect"
          @edit-lag="lagSlideoverRef?.openEdit($event)"
          @delete-lag="onDeleteLagClick"
        />
        <SwitchPrintLegend
          v-if="item?.ports?.length"
          :ports="item.ports"
          :vlans="vlans"
        />
        <p v-else class="text-sm text-gray-400">{{ $t('switches.ports.noPortsMessage') }}</p>
      </div>

      <!-- Recent Activity for this switch (collapsible, default collapsed) -->
      <div v-if="switchActivity.length" class="mt-6">
        <button
          class="mb-3 flex w-full items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          @click="showActivity = !showActivity"
        >
          <UIcon name="i-heroicons-chevron-right" :class="['h-4 w-4 transition-transform', showActivity ? 'rotate-90' : '']" />
          <UIcon name="i-heroicons-clock" class="h-4 w-4" />
          {{ $t('switches.recentActivity') }}
          <span class="text-xs font-normal text-gray-400">({{ switchActivity.length }})</span>
        </button>
        <div v-show="showActivity" class="space-y-1">
          <div v-for="entry in switchActivity" :key="entry.id" class="rounded px-3 py-2 text-sm alt-row">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded"
                :class="entry.action === 'create' ? 'bg-green-500/15 text-green-500' : entry.action === 'delete' ? 'bg-red-500/15 text-red-500' : 'bg-primary-500/15 text-primary-500'"
              >
                <UIcon
                  :name="entry.action === 'create' ? 'i-heroicons-plus' : entry.action === 'delete' ? 'i-heroicons-minus' : 'i-heroicons-pencil'"
                  class="h-3 w-3"
                />
              </span>
              <span class="font-mono text-xs text-gray-500">{{ entry.action }}</span>
              <span v-if="entry.metadata?.port_label" class="text-xs font-medium">{{ entry.metadata.port_label }}</span>
              <span v-if="formatActivitySummary(entry)" class="truncate text-xs text-gray-400">{{ formatActivitySummary(entry) }}</span>
              <span class="ml-auto shrink-0 text-xs text-gray-500">{{ relativeTime(entry.timestamp) }}</span>
            </div>
            <!-- Detailed diff -->
            <div v-if="formatActivityDetail(entry).length" class="ml-7 mt-1 space-y-0.5">
              <div v-for="diff in formatActivityDetail(entry)" :key="diff.field" class="flex gap-2 text-xs">
                <span class="w-28 shrink-0 text-gray-500">{{ diff.field }}</span>
                <span class="text-red-400 line-through">{{ diff.from }}</span>
                <span class="text-gray-500">→</span>
                <span class="text-green-400">{{ diff.to }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Port Side Panel -->
    <SwitchPortSidePanel
      v-model="showPortPanel"
      :port="selectedPort"
      :switch-id="id"
      :lag-group="selectedPort ? lagByPortId.get(selectedPort.id) : undefined"
      @saved="fetchSwitch"
      @remove-from-lag="onRemovePortFromLag"
    />

    <!-- Edit Side Panel -->
    <USlideover v-model:open="editMode" :title="$t('switches.edit')" description="Modify switch properties">

      <template #body>
        <UForm ref="editFormRef" :state="editForm" :validate="validateEdit" :validate-on="['blur', 'change']" novalidate class="space-y-4" @submit="onSave">
          <UFormField :label="$t('switches.fields.name') + ' *'" name="name" required>
            <UInput v-model="editForm.name" required class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.fields.model')" name="model">
            <UInput v-model="editForm.model" class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.fields.manufacturer')" name="manufacturer">
            <UInput v-model="editForm.manufacturer" class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.fields.serialNumber')" name="serial_number">
            <UInput v-model="editForm.serial_number" class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.fields.location')" name="location">
            <UInput v-model="editForm.location" class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.fields.rackPosition')" name="rack_position">
            <UInput v-model="editForm.rack_position" class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.fields.managementIp')" name="management_ip">
            <UInput v-model="editForm.management_ip" class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.fields.firmwareVersion')" name="firmware_version">
            <UInput v-model="editForm.firmware_version" class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.fields.layoutTemplate')" name="layout_template_id">
            <USelectMenu :search-input="false"
              v-model="editForm.layout_template_id"
              :items="templateOptions"

              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField v-if="editForm.layout_template_id" :label="$t('switches.stackSize')" name="stack_size">
            <USelect
              v-model="editForm.stack_size"
              :items="stackSizeOptions"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('switches.fields.role')" name="role">
            <USelectMenu :search-input="false"
              v-model="editForm.role"
              :items="editRoleOptions"
              placeholder="---"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('switches.fields.tags')" name="tags">
            <UInput
              v-model="editTagInput"
              :placeholder="$t('switches.tagsPlaceholder')"
              @keydown.enter.prevent="addEditTag"
              class="w-full"
            />
            <div v-if="editForm.tags.length > 0" class="mt-2 flex flex-wrap gap-1">
              <UBadge v-for="tg in editForm.tags" :key="tg" color="neutral" variant="soft" size="sm" class="cursor-pointer" @click="removeEditTag(tg)">
                {{ tg }} <UIcon name="i-heroicons-x-mark" class="ml-0.5 h-3 w-3" />
              </UBadge>
            </div>
          </UFormField>

          <UFormField :label="$t('common.notes')" name="notes">
            <UTextarea v-model="editForm.notes" :rows="3" class="w-full" />
          </UFormField>
        </UForm>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="editMode = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="saving" icon="i-heroicons-check" @click="editFormRef?.submit()">
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

    <!-- LAG Slideover -->
    <SwitchLagGroupSlideover
      ref="lagSlideoverRef"
      :switch-id="id"
      :ports="item?.ports || []"
      :existing-lags="lagGroups"
      @saved="onLagSaved"
    />

    <!-- LAG Delete confirmation -->
    <SharedConfirmDialog
      v-model="showLagDeleteDialog"
      :title="$t('lag.delete')"
      :message="lagDeleteMessage"
      :confirm-label="$t('common.delete')"
      :loading="deletingLag"
      @confirm="onDeleteLag"
    />
  </div>
</template>

<script setup lang="ts">
import { formatActivitySummary, formatActivityDetail } from '~/utils/activityFormat'

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const siteId = computed(() => route.params.siteId as string)

const id = route.params.id as string
const { item, loading, fetch: fetchSwitch, update } = useSwitch(id)

useHead({ title: computed(() => item.value?.name || t('switches.title')) })
const { duplicate } = useSwitches()
const { items: templates, fetch: fetchTemplates } = useLayoutTemplates()
const { items: vlans, fetch: fetchVlans } = useVlans()
const { items: lagGroups, loading: lagLoading, fetch: fetchLags, lagById, lagByPortId, update: updateLag, remove: removeLag } = useLagGroups(id)

const lagSlideoverRef = ref<any>(null)
const showLagDeleteDialog = ref(false)
const lagToDelete = ref<any>(null)
const deletingLag = ref(false)

const editMode = ref(false)
const saving = ref(false)
const editFormRef = ref()
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

const canCreateLag = computed(() => {
  if (selectedPorts.value.length < 2) return { allowed: false, reason: t('lag.validation.minPorts') }
  for (const portId of selectedPorts.value) {
    const existingLag = lagByPortId.value.get(portId)
    if (existingLag) {
      const port = item.value?.ports?.find((p: any) => p.id === portId)
      return { allowed: false, reason: t('lag.validation.portInLag', { port: port?.label || portId, lag: existingLag.name }) }
    }
  }
  return { allowed: true, reason: '' }
})

const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))

watch(item, (sw) => {
  if (sw?.name) {
    breadcrumbOverrides.value[`/sites/${siteId.value}/switches/${id}`] = sw.name
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
      await $fetch(`/api/switches/${id}/ports/${portId}`, { method: 'DELETE' as any })
    }
    toast.add({ title: t('switches.ports.bulkResetDone', { count: selectedPorts.value.length }), color: 'success' })
    selectedPorts.value = []
    await fetchSwitch()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
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
  notes: '',
  stack_size: 1
})

const stackSizeOptions = Array.from({ length: 8 }, (_, i) => ({
  label: String(i + 1),
  value: i + 1
}))

const editRoleOptions = computed(() => [
  { label: t('switches.roles.core'), value: 'core' },
  { label: t('switches.roles.distribution'), value: 'distribution' },
  { label: t('switches.roles.access'), value: 'access' },
  { label: t('switches.roles.management'), value: 'management' }
])

function roleColor(role: string): any {
  const map: Record<string, string> = { core: 'error', distribution: 'info', access: 'success', management: 'warning' }
  return map[role] || 'neutral'
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
  editForm.stack_size = (item.value as any).stack_size ?? 1
  editTagInput.value = ''
  editMode.value = true
}

function validateEdit(state: any) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: 'Name is required' })
  }
  if (state.management_ip?.trim() && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(state.management_ip.trim())) {
    errors.push({ name: 'management_ip', message: 'Must be a valid IPv4 address (e.g. 192.168.1.1)' })
  }
  return errors
}

async function onSave() {
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
    body.stack_size = editForm.stack_size || 1
    await update(body)
    toast.add({ title: t('switches.messages.updated'), color: 'success' })
    editMode.value = false
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function onDuplicate() {
  try {
    const result = await duplicate(id)
    toast.add({ title: t('switches.messages.duplicated'), color: 'success' })
    if (result && (result as any).id) {
      await navigateTo(`/sites/${siteId.value}/switches/${(result as any).id}`)
    }
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  }
}

async function onDelete() {
  deleting.value = true
  try {
    await $fetch(`/api/switches/${id}`, { method: 'DELETE' as any })
    toast.add({ title: t('switches.messages.deleted'), color: 'success' })
    showDeleteDialog.value = false
    await navigateTo(`/sites/${siteId.value}/switches`)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

watch([item, templates], () => {
  if (item.value?.layout_template_id) {
    const tpl = templates.value.find(t => t.id === item.value!.layout_template_id)
    const baseUnits = tpl?.units || []
    const stackSize = item.value?.stack_size ?? 1

    if (stackSize > 1 && baseUnits.length > 0) {
      // Increment first number in label for stacking (client-side version)
      const incrementLabel = (label: string, memberIdx: number): string => {
        if (memberIdx === 1) return label
        const match = label.match(/^(.*?)(\d+)(.*)$/)
        if (match) return `${match[1]}${parseInt(match[2]!, 10) + memberIdx - 1}${match[3]}`
        return `${memberIdx}/${label}`
      }

      // Duplicate units for each stack member with incremented block labels
      const stacked: any[] = []
      for (let member = 1; member <= stackSize; member++) {
        for (const unit of baseUnits) {
          stacked.push({
            ...unit,
            unit_number: unit.unit_number + (member - 1) * baseUnits.length,
            label: unit.label ? `Member ${member} - ${unit.label}` : `Member ${member}`,
            blocks: unit.blocks.map((b: any) => ({
              ...b,
              label: b.label ? incrementLabel(b.label, member) : b.label
            }))
          })
        }
      }
      templateUnits.value = stacked
    } else {
      templateUnits.value = baseUnits
    }
  } else {
    templateUnits.value = []
  }
}, { immediate: true })

const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

// LAG event handlers
function onDeleteLagClick(lag: any) {
  lagToDelete.value = lag
  showLagDeleteDialog.value = true
}

const lagDeleteMessage = computed(() => {
  if (!lagToDelete.value) return ''
  const portLabels = lagToDelete.value.port_ids
    .map((pid: string) => item.value?.ports?.find((p: any) => p.id === pid)?.label || pid)
    .join(', ')
  let msg = `${t('lag.deleteConfirm', { name: lagToDelete.value.name })}\n\n${t('lag.portsWillBeReleased')}: ${portLabels}`
  // If there's a mirror LAG on the remote switch, mention it
  if (lagToDelete.value.remote_device_id && lagToDelete.value.remote_device) {
    msg += `\n\n${t('lag.deleteRemoteLagToo', { switch: lagToDelete.value.remote_device })}`
  }
  return msg
})

async function onDeleteLag() {
  if (!lagToDelete.value) return
  deletingLag.value = true
  try {
    const lag = lagToDelete.value

    // Delete mirror LAG on remote switch if it exists
    if (lag.remote_device_id) {
      try {
        const remoteLags = await $fetch<any[]>(`/api/switches/${lag.remote_device_id}/lag-groups`)
        const mirrorLag = remoteLags?.find((rl: any) => rl.remote_device_id === id)
        if (mirrorLag) {
          await $fetch(`/api/switches/${lag.remote_device_id}/lag-groups/${mirrorLag.id}`, { method: 'DELETE' })
        }
      } catch { /* best-effort */ }
    }

    await removeLag(lag.id)
    toast.add({ title: t('lag.messages.deleted'), color: 'success' })
    showLagDeleteDialog.value = false
    lagToDelete.value = null
    await fetchSwitch()
    await fetchLags()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    deletingLag.value = false
  }
}

async function onLagSaved() {
  selectedPorts.value = []
  await fetchSwitch()
  await fetchLags()
}

async function onRemovePortFromLag(lagId: string, portId: string) {
  const lag = lagById.value.get(lagId)
  if (!lag) return
  try {
    const newPortIds = lag.port_ids.filter(pid => pid !== portId)

    if (newPortIds.length < 2) {
      // LAG would have < 2 ports — delete it and mirror LAG
      if (lag.remote_device_id) {
        try {
          const remoteLags = await $fetch<any[]>(`/api/switches/${lag.remote_device_id}/lag-groups`)
          const mirrorLag = remoteLags?.find((rl: any) => rl.remote_device_id === id)
          if (mirrorLag) {
            await $fetch(`/api/switches/${lag.remote_device_id}/lag-groups/${mirrorLag.id}`, { method: 'DELETE' })
          }
        } catch { /* best-effort */ }
      }
      await removeLag(lagId)
      toast.add({ title: t('lag.messages.deleted'), color: 'success' })
    } else {
      // Remove port from local LAG
      await updateLag(lagId, { port_ids: newPortIds })

      // Sync mirror LAG: remove the corresponding remote port
      if (lag.remote_device_id) {
        try {
          const remoteLags = await $fetch<any[]>(`/api/switches/${lag.remote_device_id}/lag-groups`)
          const mirrorLag = remoteLags?.find((rl: any) => rl.remote_device_id === id)
          if (mirrorLag) {
            // Find which remote port was mapped to this local port
            const localPort = item.value?.ports?.find((p: any) => p.id === portId)
            const remotePortId = localPort?.connected_port_id
            if (remotePortId) {
              const newRemotePortIds = mirrorLag.port_ids.filter((pid: string) => pid !== remotePortId)
              if (newRemotePortIds.length < 2) {
                await $fetch(`/api/switches/${lag.remote_device_id}/lag-groups/${mirrorLag.id}`, { method: 'DELETE' })
              } else {
                await $fetch(`/api/switches/${lag.remote_device_id}/lag-groups/${mirrorLag.id}`, {
                  method: 'PUT', body: { port_ids: newRemotePortIds }
                })
              }
            }
          }
        } catch { /* best-effort */ }
      }
      toast.add({ title: t('lag.messages.portRemoved'), color: 'success' })
    }
    await fetchSwitch()
    await fetchLags()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  }
}

// Deep-link: ?lag=xyz opens the LAG slideover when data is ready
const lagParam = route.query.lag as string | undefined
if (lagParam) {
  const stopWatch = watch(lagById, (map) => {
    const lag = map.get(lagParam)
    if (lag) {
      lagSlideoverRef.value?.openEdit(lag)
      stopWatch()
    }
  }, { immediate: true })
}


// Activity log for this switch
const showActivity = ref(false)
const switchActivity = ref<any[]>([])
const { apiFetch } = useApiFetch()

async function fetchActivity() {
  try {
    const data = await apiFetch<any>('/api/activity', { params: { entity_id: id, limit: 20 } })
    switchActivity.value = data.data || []
  } catch { /* ignore */ }
}

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours}h`
  const days = Math.floor(hours / 24)
  return `vor ${days}d`
}

onMounted(() => {
  fetchSwitch()
  fetchTemplates()
  fetchVlans(siteParams.value)
  fetchLags()
  fetchActivity()
})
</script>
