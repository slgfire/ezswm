<template>
  <div class="p-6">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <template v-else-if="template">
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton to="/layout-templates" icon="i-heroicons-arrow-left" variant="ghost" size="sm" />
          <h1 class="text-xl font-bold">{{ template.name }}</h1>
        </div>
        <div class="flex items-center gap-1">
          <UTooltip :text="$t('common.edit')">
            <UButton :to="`/layout-templates/${template.id}/edit`" icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" />
          </UTooltip>
          <UTooltip :text="$t('common.duplicate')">
            <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click="onDuplicate" />
          </UTooltip>
          <UTooltip :text="$t('common.delete')">
            <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs" @click="showDeleteDialog = true" />
          </UTooltip>
        </div>
      </div>

      <!-- Quick info -->
      <div class="-mt-2 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
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
        <span v-if="template.description" class="text-gray-400">— {{ template.description }}</span>
      </div>

      <!-- Units -->
      <div class="space-y-4">
        <div
          v-for="unit in template.units"
          :key="unit.unit_number"
          class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/30"
        >
          <div class="mb-3 flex items-center justify-between">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {{ unit.label || `Unit ${unit.unit_number}` }}
            </span>
            <span class="text-xs text-gray-400">{{ getUnitPortCount(unit) }} {{ $t('templates.infoBar.ports') }}</span>
          </div>

          <div v-if="unit.blocks && unit.blocks.length > 0" class="space-y-2">
            <div
              v-for="(block, blockIdx) in unit.blocks"
              :key="blockIdx"
              class="flex items-center gap-3 rounded border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <UBadge :color="getPortTypeColor(block.type)" variant="subtle" size="xs">
                {{ block.type.toUpperCase() }}
              </UBadge>
              <div class="flex flex-1 flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span><span class="text-gray-400 dark:text-gray-500">{{ $t('templates.infoBar.count') }}:</span> {{ block.count }}</span>
                <span><span class="text-gray-400 dark:text-gray-500">{{ $t('templates.infoBar.start') }}:</span> {{ block.start_index }}</span>
                <span><span class="text-gray-400 dark:text-gray-500">{{ $t('templates.infoBar.rows') }}:</span> {{ block.rows }}</span>
                <span v-if="block.row_layout && block.row_layout !== 'sequential'">
                  <span class="text-gray-400 dark:text-gray-500">{{ $t('templates.infoBar.layout') }}:</span> {{ block.row_layout }}
                </span>
                <span v-if="block.default_speed">
                  <span class="text-gray-400 dark:text-gray-500">{{ $t('templates.infoBar.speed') }}:</span> {{ block.default_speed }}
                </span>
                <span v-if="block.label" class="font-mono">
                  <span class="text-gray-400 dark:text-gray-500">{{ $t('templates.infoBar.label') }}:</span> {{ block.label }}
                </span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-500">{{ $t('common.noData') }}</p>
        </div>
      </div>

      <div v-if="!template.units || template.units.length === 0" class="py-8 text-center text-gray-500">
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
      v-model="showDeleteDialog"
      :title="$t('templates.delete')"
      :message="$t('templates.confirmDelete')"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const route = useRoute()
const { getById, remove } = useLayoutTemplates()

const template = ref<any>(null)
const loading = ref(true)
const showDeleteDialog = ref(false)
const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))

watch(template, (tpl) => {
  if (tpl?.name) breadcrumbOverrides.value[`/layout-templates/${route.params.id}`] = tpl.name
}, { immediate: true })

function getUnitPortCount(unit: any): number {
  if (!unit.blocks) return 0
  return unit.blocks.reduce((total: number, block: any) => total + (block.count || 0), 0)
}

function getTotalPortCount(): number {
  if (!template.value?.units) return 0
  return template.value.units.reduce((t: number, u: any) => t + getUnitPortCount(u), 0)
}

function getPortTypeColor(type: string): string {
  const colors: Record<string, string> = {
    rj45: 'blue', sfp: 'green', 'sfp+': 'purple', qsfp: 'pink',
    console: 'yellow', management: 'orange'
  }
  return colors[type] || 'gray'
}

function onDuplicate() {
  navigateTo(`/layout-templates/create?clone=${route.params.id}`)
}

async function handleDelete() {
  try {
    await remove(route.params.id as string)
    toast.add({ title: t('templates.messages.deleted'), color: 'green' })
    router.push('/layout-templates')
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'red' })
  } finally {
    showDeleteDialog.value = false
  }
}

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
