<template>
  <div class="p-6">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
      <span class="ml-2 text-gray-400">{{ $t('common.loading') }}</span>
    </div>

    <template v-else-if="template">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <UButton to="/layout-templates" icon="i-heroicons-arrow-left" color="gray" variant="ghost" />
          <h1 class="text-2xl font-bold">{{ template.name }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            :to="`/layout-templates/${template.id}/edit`"
            icon="i-heroicons-pencil-square"
            color="gray"
          >
            {{ $t('common.edit') }}
          </UButton>
          <UButton
            icon="i-heroicons-trash"
            color="red"
            variant="soft"
            @click="showDeleteDialog = true"
          >
            {{ $t('common.delete') }}
          </UButton>
        </div>
      </div>

      <!-- Template Info -->
      <UCard class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span class="text-sm text-gray-500">{{ $t('templates.fields.name') }}</span>
            <p class="font-medium">{{ template.name }}</p>
          </div>
          <div>
            <span class="text-sm text-gray-500">{{ $t('templates.fields.manufacturer') }}</span>
            <p class="font-medium">{{ template.manufacturer || '-' }}</p>
          </div>
          <div>
            <span class="text-sm text-gray-500">{{ $t('templates.fields.model') }}</span>
            <p class="font-medium">{{ template.model || '-' }}</p>
          </div>
          <div>
            <span class="text-sm text-gray-500">{{ $t('common.description') }}</span>
            <p class="font-medium">{{ template.description || '-' }}</p>
          </div>
        </div>
      </UCard>

      <!-- Units and Blocks Layout -->
      <h2 class="text-lg font-semibold mb-4">{{ $t('templates.units.title') }} ({{ template.units?.length || 0 }})</h2>

      <div v-for="unit in template.units" :key="unit.unit_number" class="mb-4">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">
                {{ unit.label || `${$t('templates.units.unitNumber')} ${unit.unit_number}` }}
              </span>
              <UBadge color="gray" variant="subtle">
                {{ getUnitPortCount(unit) }} {{ $t('templates.fields.portCount') }}
              </UBadge>
            </div>
          </template>

          <div v-if="unit.blocks && unit.blocks.length > 0" class="space-y-3">
            <div
              v-for="(block, blockIdx) in unit.blocks"
              :key="blockIdx"
              class="flex items-center gap-4 p-3 bg-gray-800 rounded-md"
            >
              <UBadge :color="getPortTypeColor(block.type)" variant="subtle">
                {{ block.type.toUpperCase() }}
              </UBadge>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 text-sm">
                <div>
                  <span class="text-gray-500">{{ $t('templates.blocks.count') }}:</span>
                  <span class="ml-1 font-medium">{{ block.count }}</span>
                </div>
                <div>
                  <span class="text-gray-500">{{ $t('templates.blocks.startIndex') }}:</span>
                  <span class="ml-1 font-medium">{{ block.start_index }}</span>
                </div>
                <div>
                  <span class="text-gray-500">{{ $t('templates.blocks.rows') }}:</span>
                  <span class="ml-1 font-medium">{{ block.rows }}</span>
                </div>
                <div v-if="block.label">
                  <span class="text-gray-500">{{ $t('templates.blocks.label') }}:</span>
                  <span class="ml-1 font-medium">{{ block.label }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-4 text-sm text-gray-500">
            {{ $t('common.noData') }}
          </div>
        </UCard>
      </div>

      <div v-if="!template.units || template.units.length === 0" class="text-center py-8 text-gray-500">
        {{ $t('common.noData') }}
      </div>
    </template>

    <div v-else class="text-center py-12">
      <SharedEmptyState
        icon="i-heroicons-exclamation-triangle"
        :title="$t('errors.notFound')"
      >
        <template #action>
          <UButton to="/layout-templates" icon="i-heroicons-arrow-left">
            {{ $t('common.back') }}
          </UButton>
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

function getUnitPortCount(unit: any): number {
  if (!unit.blocks) return 0
  return unit.blocks.reduce((total: number, block: any) => total + (block.count || 0), 0)
}

function getPortTypeColor(type: string): string {
  const colors: Record<string, string> = {
    rj45: 'blue',
    sfp: 'green',
    'sfp+': 'purple',
    qsfp: 'pink',
    console: 'yellow',
    management: 'orange'
  }
  return colors[type] || 'gray'
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
