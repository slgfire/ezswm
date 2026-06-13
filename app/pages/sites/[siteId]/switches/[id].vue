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
        <!-- Group A: View/Panel toggles -->
        <UButton
          icon="i-heroicons-square-3-stack-3d"
          variant="ghost"
          color="primary"
          size="sm"
          label="VLANs"
          @click="showVlanSlideover = true"
        />
        <UButton
          icon="i-heroicons-table-cells"
          variant="ghost"
          color="neutral"
          size="sm"
          :label="$t('switches.detailsAction')"
          class="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          @click="showSecondaryDetails = true"
        />

        <!-- Divider -->
        <span class="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

        <!-- Group B: Actions -->
        <SwitchPublicAccess
          :switch-id="id"
          :site-id="siteId"
          :switch-name="item.name"
          :switch-location="item.location"
        />
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
            variant="soft"
            color="neutral"
            size="sm"
            @click="onDuplicate"
          />
        </UTooltip>

        <!-- Divider -->
        <span class="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

        <!-- Group C: Destructive -->
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
      <!-- Info bar with inline expand toggle -->
      <SwitchInfoBar
        :item="item"
        :port-stats="portStats"
        :current-template-name="currentTemplateName"
        v-model:show-details="showDetails"
      />

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
        :configured-vlans="item?.configured_vlans || []"
        :switch-updated-at="item?.updated_at"
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
          @view-lag="onViewLag"
          @delete-lag="onDeleteLagClick"
        />
        <SwitchPrintLegend
          v-if="item?.ports?.length"
          :ports="item.ports"
          :vlans="vlans"
        />
        <p v-else class="text-sm text-gray-400">{{ $t('switches.ports.noPortsMessage') }}</p>
      </div>

      <!-- VLAN Management Slideover -->
      <USlideover v-model:open="showVlanSlideover" :title="$t('vlans.configuredTitle')">
        <template #body>
          <SwitchConfiguredVlans
            :switch-id="item.id"
            :switch-name="item.name"
            :configured-vlans="item.configured_vlans || []"
            :all-vlans="vlans"
            :updated-at="item.updated_at"
            @updated="fetchSwitch"
          />
        </template>
      </USlideover>

      <!-- Secondary Details Slideover (Port Table + Activity) -->
      <USlideover v-model:open="showSecondaryDetails" :title="$t('switches.detailsAction')">
        <template #body>
          <UTabs :items="secondaryTabs" class="w-full">
            <template #content="{ item: tab }">
              <!-- Port Table Tab -->
              <div v-if="tab.key === 'ports' && item?.ports?.length" class="pt-3">
                <SwitchPortTable
                  :ports="item.ports"
                  :vlans="vlans"
                  embedded
                  @select-port="(id: string) => { showSecondaryDetails = false; onSelectPort(id) }"
                />
              </div>
              <!-- Activity Tab -->
              <div v-else-if="tab.key === 'activity'" class="pt-3 space-y-1">
                <div v-if="!switchActivity.length" class="text-sm text-dimmed py-4 text-center">
                  {{ $t('common.noResults') }}
                </div>
                <div v-for="entry in switchActivity" :key="entry.id" class="alt-row rounded px-3 py-2 text-sm">
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
                    <span v-if="formatActivity(entry)" class="truncate text-xs text-gray-300">{{ formatActivity(entry) }}</span>
                    <span v-else class="text-xs text-gray-500">{{ entry.action }}</span>
                    <span class="ml-auto shrink-0 text-xs text-gray-500">{{ relTime(entry.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </UTabs>
        </template>
      </USlideover>

    </div>

    <!-- Port Side Panel -->
    <SwitchPortSidePanel
      v-model="showPortPanel"
      :port="selectedPort!"
      :switch-id="id"
      :configured-vlans="item?.configured_vlans || []"
      :switch-updated-at="item?.updated_at"
      :lag-group="selectedPort ? lagByPortId.get(selectedPort.id) : undefined"
      :template-units="templateUnits"
      @saved="fetchSwitch"
      @remove-from-lag="onRemovePortFromLag"
    />

    <!-- Edit Side Panel -->
    <USlideover v-model:open="editMode" :title="$t('switches.edit')" description="Modify switch properties">

      <template #body>
        <UForm ref="editFormRef" :state="editForm" :validate="validateEdit" :validate-on="['blur', 'change']" novalidate class="space-y-4" @submit="onSave">
          <UFormField :label="$t('switches.fields.name')" name="name" required>
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
            <USelectMenu
v-model="editForm.layout_template_id"
              :search-input="false"
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
            <USelectMenu
v-model="editForm.role"
              :search-input="false"
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
              class="w-full"
              @keydown.enter.prevent="addEditTag"
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

    <!-- LAG Detail Modal (touch devices) -->
    <UModal v-model:open="showLagDetail" :title="viewingLag?.name || 'LAG'" :description="$t('lag.group')">
      <template #body>
        <div v-if="viewingLag" class="space-y-3">
          <div v-if="viewingLag.description" class="text-sm text-gray-400">{{ viewingLag.description }}</div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-500">{{ $t('lag.ports') }}:</span>
            <span class="font-medium">{{ viewingLag.port_ids.length }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <UBadge v-for="pid in viewingLag.port_ids" :key="pid" variant="subtle" size="sm">
              {{ getPortLabel(pid) }}
            </UBadge>
          </div>
          <div v-if="viewingLag.remote_device" class="flex items-center gap-2 text-sm">
            <span class="text-gray-500">{{ $t('lag.remoteDevice') }}:</span>
            <span class="font-medium">{{ viewingLag.remote_device }}</span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showLagDetail = false">{{ $t('common.close') }}</UButton>
          <UButton @click="showLagDetail = false; lagSlideoverRef?.openEdit(viewingLag!)">{{ $t('lag.edit') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- LAG Slideover -->
    <SwitchLagGroupSlideover
      ref="lagSlideoverRef"
      :switch-id="id"
      :site-id="siteId"
      :ports="item?.ports || []"
      :existing-lags="lagGroups"
      :configured-vlans="item?.configured_vlans || []"
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
import type { Port } from '~~/types/port'
import type { LAGGroup } from '~~/types/lagGroup'
import type { ActivityEntry } from '~~/types/activity'
import { formatActivitySummary as _formatActivitySummary } from '~/utils/activityFormat'
import { relativeTime as _relativeTime } from '~/utils/timeFormat'

const { t } = useI18n()
const formatActivity = (entry: ActivityEntry) => _formatActivitySummary(entry, t, true)
const relTime = (ts: string) => _relativeTime(ts, t)
const toast = useToast()
const route = useRoute()
const siteId = computed(() => route.params.siteId as string)

const id = route.params.id as string
const { item, loading, fetch: fetchSwitch, update } = useSwitch(id, siteId.value)

useHead({ title: computed(() => item.value?.name || t('switches.title')) })
const { duplicate } = useSwitches()
const { items: templates, fetch: fetchTemplates } = useLayoutTemplates()
const { items: vlans, fetch: fetchVlans } = useVlans()
const { items: lagGroups, fetch: fetchLags, lagById, lagByPortId, update: updateLag, remove: removeLag } = useLagGroups(id, siteId)

const lagSlideoverRef = ref<{ openEdit: (lag: LAGGroup) => void; openCreate: (ports: string[]) => void } | null>(null)
const showLagDeleteDialog = ref(false)
const lagToDelete = ref<LAGGroup | null>(null)
const deletingLag = ref(false)
const showLagDetail = ref(false)
const viewingLag = ref<LAGGroup | null>(null)

function onViewLag(lag: LAGGroup) {
  viewingLag.value = lag
  showLagDetail.value = true
}

function getPortLabel(portId: string): string {
  const port = item.value?.ports?.find((p: Port) => p.id === portId)
  if (!port) return portId
  return port.label || `${port.unit}/${port.index}`
}

const { editMode, saving, editFormRef, editTagInput, editForm, stackSizeOptions, editRoleOptions, templateOptions, openEditPanel, validateEdit, onSave, addEditTag, removeEditTag } = useSwitchEditForm(item, templates, update)

const showDeleteDialog = ref(false)
const deleting = ref(false)
const showDetails = ref(false)
const showVlanSlideover = ref(false)
const showSecondaryDetails = ref(false)

const secondaryTabs = computed(() => [
  { label: t('switches.tabs.ports'), key: 'ports' },
  { label: t('switches.tabs.activity'), key: 'activity' }
])

const selectedPorts = ref<string[]>([])
const bulkEditorRef = ref<{ submit: () => void; open: () => void } | null>(null)
const showPortPanel = ref(false)
const selectedPort = ref<Port | null>(null)
const { templateUnits } = useTemplateUnits(item, templates)

const portStats = computed(() => {
  const ports = item.value?.ports || []
  return {
    up: ports.filter((p) => p.status === 'up').length,
    down: ports.filter((p) => p.status === 'down').length,
    disabled: ports.filter((p) => p.status === 'disabled').length
  }
})

const canCreateLag = computed(() => {
  if (selectedPorts.value.length < 2) return { allowed: false, reason: t('lag.validation.minPorts') }
  for (const portId of selectedPorts.value) {
    const existingLag = lagByPortId.value.get(portId)
    if (existingLag) {
      const port = item.value?.ports?.find((p) => p.id === portId)
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
  const port = item.value?.ports?.find((p) => p.id === portId)
  if (port) {
    selectedPort.value = port
    showPortPanel.value = true
  }
}

async function bulkReset() {
  if (!window.confirm(t('switches.ports.confirmBulkReset', { count: selectedPorts.value.length }))) return
  try {
    for (const portId of selectedPorts.value) {
      await ($fetch as typeof globalThis.fetch)(`/api/switches/${id}/ports/${portId}?siteId=${encodeURIComponent(siteId.value)}`, { method: 'DELETE' })
    }
    toast.add({ title: t('switches.ports.bulkResetDone', { count: selectedPorts.value.length }), color: 'success' })
    selectedPorts.value = []
    await fetchSwitch()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  }
}

function onToggleSelect(portId: string) {
  const idx = selectedPorts.value.indexOf(portId)
  if (idx >= 0) selectedPorts.value.splice(idx, 1)
  else selectedPorts.value.push(portId)
}

const currentTemplateName = computed(() => {
  if (!item.value?.layout_template_id) return null
  const tpl = templates.value.find(t => t.id === item.value!.layout_template_id)
  return tpl?.name || item.value.layout_template_id
})

async function onDuplicate() {
  try {
    const result = await duplicate(id)
    toast.add({ title: t('switches.messages.duplicated'), color: 'success' })
    if (result?.id) {
      await navigateTo(`/sites/${siteId.value}/switches/${result.slug || result.id}`)
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  }
}

async function onDelete() {
  deleting.value = true
  try {
    await ($fetch as typeof globalThis.fetch)(`/api/switches/${id}`, { method: 'DELETE' })
    toast.add({ title: t('switches.messages.deleted'), color: 'success' })
    showDeleteDialog.value = false
    await navigateTo(`/sites/${siteId.value}/switches`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

// LAG event handlers
function onDeleteLagClick(lag: LAGGroup) {
  lagToDelete.value = lag
  showLagDeleteDialog.value = true
}

const lagDeleteMessage = computed(() => {
  if (!lagToDelete.value) return ''
  const portLabels = lagToDelete.value.port_ids
    .map((pid: string) => item.value?.ports?.find((p) => p.id === pid)?.label || pid)
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
        const remoteLags = await $fetch<LAGGroup[]>(`/api/switches/${lag.remote_device_id}/lag-groups`)
        const mirrorLag = remoteLags?.find((rl) => rl.remote_device_id === id)
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
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
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
          const remoteLags = await $fetch<LAGGroup[]>(`/api/switches/${lag.remote_device_id}/lag-groups`)
          const mirrorLag = remoteLags?.find((rl) => rl.remote_device_id === id)
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
          const remoteLags = await $fetch<LAGGroup[]>(`/api/switches/${lag.remote_device_id}/lag-groups`)
          const mirrorLag = remoteLags?.find((rl) => rl.remote_device_id === id)
          if (mirrorLag) {
            // Find which remote port was mapped to this local port
            const localPort = item.value?.ports?.find((p) => p.id === portId)
            const remotePortId = localPort?.connected_port_id
            if (remotePortId) {
              const newRemotePortIds = mirrorLag.port_ids.filter((pid) => pid !== remotePortId)
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
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
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
const { activities: switchActivity, fetchActivity } = useActivityLog(id)


onMounted(() => {
  fetchSwitch()
  fetchTemplates()
  fetchVlans(siteParams.value)
  fetchLags()
  fetchActivity()
})
</script>
