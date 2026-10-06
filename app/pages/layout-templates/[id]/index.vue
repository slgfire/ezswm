<template>
  <div class="p-6">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <template v-else-if="template">
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <UButton to="/layout-templates" icon="i-heroicons-arrow-left" variant="ghost" size="sm" />
          <div class="min-w-0">
            <h1 class="break-words text-xl font-bold">{{ template.name }}</h1>
            <p class="mt-1 text-sm text-muted">{{ $t('templates.detailDescription') }}</p>
          </div>
        </div>
        <div v-if="authResolved && canEditInfrastructure" class="flex items-center gap-1">
          <UTooltip :text="$t('common.edit')">
            <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click="navigateToEditor" />
          </UTooltip>
          <UTooltip :text="$t('common.duplicate')">
            <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click="onDuplicate" />
          </UTooltip>
          <UTooltip :text="$t('common.delete')">
            <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="openDeleteDialog" />
          </UTooltip>
        </div>
      </div>

      <SharedViewOnlyNotice v-if="authResolved && !canEditInfrastructure" class="mb-4" />

      <!-- Quick info -->
      <div class="mt-1 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span v-if="template.manufacturer" class="flex items-center gap-1">
          <UIcon name="i-heroicons-building-office" class="h-3.5 w-3.5" />
          {{ template.manufacturer }}
        </span>
        <span v-if="template.model" class="flex items-center gap-1">
          <UIcon name="i-heroicons-cpu-chip" class="h-3.5 w-3.5" />
          {{ template.model }}
        </span>
        <span class="flex items-center gap-1">
          <UIcon name="i-heroicons-square-3-stack-3d" class="h-3.5 w-3.5" />
          {{ template.units?.length || 0 }} {{ $t('templates.infoBar.units') }}
        </span>
        <span class="flex items-center gap-1">
          <UIcon name="i-heroicons-rectangle-group" class="h-3.5 w-3.5" />
          {{ getTotalPortCount() }} {{ $t('templates.infoBar.ports') }}
        </span>
        <span v-if="template.description" class="text-toned">— {{ template.description }}</span>
        <span v-if="template.airflow" class="flex items-center gap-1">
          <UIcon name="i-heroicons-arrow-right-circle" class="h-3.5 w-3.5" />
          {{ $t('airflowOptions.' + template.airflow) }}
        </span>
        <a
          v-if="template.datasheet_url"
          :href="template.datasheet_url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 text-primary hover:underline"
        >
          <UIcon name="i-heroicons-document-text" class="h-3.5 w-3.5" />
          {{ $t('templates.datasheetUrl') }} ↗
        </a>
      </div>

      <!-- Port Preview -->
      <div v-if="previewPorts.length" class="mb-6 list-container rounded-lg bg-default p-5">
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">{{ $t('templates.preview') }}</h2>
        <div class="rounded-lg border border-default bg-elevated p-4">
          <SwitchPortGrid
            :ports="(previewPorts as any[])"
            :units="template.units"
            :selected-ports="[]"
          />
        </div>
      </div>

      <!-- Units -->
      <div class="space-y-4">
        <div
          v-for="unit in template.units"
          :key="unit.unit_number"
          class="list-container rounded-lg bg-default p-5"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="font-mono text-sm font-semibold text-primary-500">UNIT {{ unit.unit_number }}</h3>
            <span class="font-mono text-xs text-muted">{{ getUnitPortCount(unit) }} ports</span>
          </div>

          <div v-if="unit.blocks && unit.blocks.length > 0" class="space-y-2">
            <div
              v-for="(block, blockIdx) in unit.blocks"
              :key="blockIdx"
              class="flex items-center gap-4 rounded-md border border-default/50 bg-elevated/50 px-4 py-3"
            >
              <UBadge :color="(getPortTypeColor(block.type) as any)" variant="subtle" size="sm" class="w-24 justify-center font-mono">
                {{ block.type.toUpperCase() }}
              </UBadge>
              <div class="flex flex-1 flex-wrap gap-x-6 gap-y-1 font-mono text-xs">
                <span class="text-default"><span class="text-muted">Count:</span> {{ block.count }}</span>
                <span class="text-default"><span class="text-muted">Start:</span> {{ block.start_index }}</span>
                <span class="text-default"><span class="text-muted">Rows:</span> {{ block.rows }}</span>
                <span v-if="block.row_layout && block.row_layout !== 'sequential'" class="text-default">
                  <span class="text-muted">Layout:</span> {{ block.row_layout }}
                </span>
                <span v-if="block.default_speed" class="text-primary-400">
                  <span class="text-muted">Speed:</span> {{ block.default_speed }}
                </span>
                <span v-if="block.label" class="text-default">
                  <span class="text-muted">Label:</span> {{ block.label }}
                </span>
                <span v-if="block.poe?.type" class="text-yellow-400">
                  <span class="text-muted">{{ $t('templates.poe') }}:</span> {{ block.poe.type }}<span v-if="block.poe.max_watts"> ({{ block.poe.max_watts }}W)</span>
                </span>
                <span v-if="block.type === 'management' && block.physical_type" class="text-default">
                  <span class="text-muted">{{ $t('templates.physicalType') }}:</span> {{ block.physical_type.toUpperCase() }}
                </span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-muted">{{ $t('common.noData') }}</p>
        </div>
      </div>

      <div v-if="!template.units || template.units.length === 0" class="py-8 text-center text-muted">
        {{ $t('common.noData') }}
      </div>
    </template>

    <div v-else class="py-12 text-center">
      <SharedEmptyState icon="i-heroicons-exclamation-triangle" :title="$t('errors.notFound')">
        <template #action>
          <UButton to="/layout-templates" icon="i-heroicons-arrow-left">{{ $t('common.back') }}</UButton>
        </template>
      </SharedEmptyState>
    </div>

    <SharedConfirmDialog
      v-if="authResolved && canEditInfrastructure"
      v-model="showDeleteDialog"
      :title="$t('templates.delete')"
      :message="$t('templates.confirmDelete')"
      :loading="deleting"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LayoutTemplate, LayoutUnit, LayoutBlock } from '~~/types/layoutTemplate'

interface PreviewPort {
  id: string
  unit: number
  index: number
  label: string
  type: string
  speed: string
  status: string
  tagged_vlans: string[]
}

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const route = useRoute()
const { getById, remove } = useLayoutTemplates()
const { authResolved, canEditInfrastructure, handleInfrastructureForbidden } = useAuth()
let permissionGeneration = 0
let accessChangeNoticeShown = false

const template = ref<LayoutTemplate | null>(null)
const loading = ref(true)

useHead({ title: computed(() => template.value?.name || t('templates.title')) })
const showDeleteDialog = ref(false)
const deleteTargetId = ref<string | null>(null)
const deleting = ref(false)
const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))

function noticeAccessChanged() {
  if (accessChangeNoticeShown) return
  accessChangeNoticeShown = true
  toast.add({ title: t('permissions.accessChanged'), color: 'warning' })
}

watch(template, (tpl) => {
  if (tpl?.name) breadcrumbOverrides.value[`/layout-templates/${route.params.id}`] = tpl.name
}, { immediate: true })

function getUnitPortCount(unit: LayoutUnit): number {
  if (!unit.blocks) return 0
  return unit.blocks.reduce((total: number, block: LayoutBlock) => total + (block.count || 0), 0)
}

function getTotalPortCount(): number {
  if (!template.value?.units) return 0
  return template.value.units.reduce((sum: number, u: LayoutUnit) => sum + getUnitPortCount(u), 0)
}

const previewPorts = computed(() => {
  if (!template.value?.units) return []
  const ports: PreviewPort[] = []
  for (const unit of template.value.units) {
    for (const block of unit.blocks || []) {
      for (let i = 0; i < (block.count || 0); i++) {
        const idx = (block.start_index || 0) + i
        ports.push({
          id: `preview-${unit.unit_number}-${idx}`,
          unit: unit.unit_number,
          index: idx,
          label: block.label ? (block.label.match(/[/\-:.]$/) ? `${block.label}${idx}` : `${idx}`) : `${idx}`,
          type: block.type,
          speed: block.default_speed || '',
          status: 'down',
          tagged_vlans: []
        })
      }
    }
  }
  return ports
})

function getPortTypeColor(type: string): string {
  const colors: Record<string, string> = {
    rj45: 'primary', sfp: 'info', 'sfp+': 'info', qsfp: 'warning',
    console: 'warning', management: 'success'
  }
  return colors[type] || 'neutral'
}

function onDuplicate() {
  if (!authResolved.value || !canEditInfrastructure.value || !template.value) return
  void navigateTo(`/layout-templates/create?clone=${template.value.id}`)
}

function navigateToEditor() {
  if (!authResolved.value || !canEditInfrastructure.value || !template.value) return
  void navigateTo(`/layout-templates/${template.value.id}/edit`)
}

function openDeleteDialog() {
  if (!authResolved.value || !canEditInfrastructure.value || !template.value) return
  deleteTargetId.value = template.value.id
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!authResolved.value || !canEditInfrastructure.value || deleting.value || !deleteTargetId.value) return
  const generation = permissionGeneration
  const targetId = deleteTargetId.value
  if (route.params.id !== targetId) return
  deleting.value = true
  try {
    await remove(targetId)
    if (generation !== permissionGeneration || !canEditInfrastructure.value || route.params.id !== targetId || deleteTargetId.value !== targetId) return
    showDeleteDialog.value = false
    deleteTargetId.value = null
    toast.add({ title: t('templates.messages.deleted'), color: 'success' })
    void router.push('/layout-templates')
  } catch (error: unknown) {
    const access = await handleInfrastructureForbidden(error)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled') return
    if (generation !== permissionGeneration || !canEditInfrastructure.value || route.params.id !== targetId || deleteTargetId.value !== targetId) return
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    if (generation === permissionGeneration && canEditInfrastructure.value && route.params.id === targetId && deleteTargetId.value === targetId) {
      showDeleteDialog.value = false
      deleteTargetId.value = null
    }
    deleting.value = false
  }
}

watch(canEditInfrastructure, (canEdit, wasEditable) => {
  if (!wasEditable || canEdit || !authResolved.value) return
  permissionGeneration++
  showDeleteDialog.value = false
  deleteTargetId.value = null
}, { flush: 'sync' })

onMounted(async () => {
  try {
    template.value = await getById(route.params.id as string)
  } catch {
    template.value = null
  } finally {
    loading.value = false
  }
})
</script>
